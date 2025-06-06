"use server";

import { db } from "@/server/db";
import { feedback, chatMessages, chatSessions, analytics, users } from "@/server/db/schema";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export interface FeedbackData {
  id: string;
  messageId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

/**
 * Submit feedback for a chat message
 */
export async function submitFeedback(data: {
  messageId: string;
  rating: number;
  comment?: string;
}) {
  const user = await requireAuth();

  // Verify the message exists and user has access
  const [message] = await db
    .select({ 
      id: chatMessages.id,
      sessionId: chatMessages.sessionId 
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, data.messageId))
    .limit(1);

  if (!message) {
    throw new Error("Message not found");
  }

  // Check if user already provided feedback for this message
  const existingFeedback = await db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.messageId, data.messageId),
        eq(feedback.userId, user.id)
      )
    )
    .limit(1);

  if (existingFeedback.length > 0) {
    // Update existing feedback
    await db
      .update(feedback)
      .set({
        rating: data.rating,
        comment: data.comment,
      })
      .where(
        and(
          eq(feedback.messageId, data.messageId),
          eq(feedback.userId, user.id)
        )
      );
  } else {
    // Create new feedback
    await db.insert(feedback).values({
      messageId: data.messageId,
      userId: user.id,
      rating: data.rating,
      comment: data.comment,
    });
  }

  // Log analytics
  const [chatMessage] = await db
    .select({ 
      sessionId: chatMessages.sessionId,
      metadata: chatMessages.metadata,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, data.messageId))
    .limit(1);

  if (chatMessage?.metadata && typeof chatMessage.metadata === 'object' && 'tenantId' in chatMessage.metadata) {
    await db.insert(analytics).values({
      tenantId: (chatMessage.metadata as any).tenantId,
      userId: user.id,
      eventType: "feedback",
      eventData: {
        messageId: data.messageId,
        sessionId: chatMessage.sessionId,
        rating: data.rating,
        hasComment: !!data.comment,
      },
    });
  }

  revalidatePath(`/chat/${message.sessionId}`);
  return { success: true };
}

/**
 * Get feedback for a specific message
 */
export async function getMessageFeedback(messageId: string) {
  const user = await requireAuth();

  const messageFeedback = await db
    .select({
      id: feedback.id,
      messageId: feedback.messageId,
      userId: feedback.userId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .where(
      and(
        eq(feedback.messageId, messageId),
        eq(feedback.userId, user.id)
      )
    )
    .limit(1);

  return messageFeedback[0] || null;
}

/**
 * Get all feedback for a tenant (admin only)
 */
export async function getTenantFeedback(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  const tenantFeedback = await db
    .select({
      id: feedback.id,
      messageId: feedback.messageId,
      userId: feedback.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      messageContent: chatMessages.content,
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .innerJoin(users, eq(feedback.userId, users.id))
    .where(eq(chatSessions.tenantId, tenantId))
    .orderBy(desc(feedback.createdAt));

  return tenantFeedback;
}

/**
 * Get feedback statistics for a tenant
 */
export async function getFeedbackStats(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  // Get average rating and total feedback count
  const stats = await db
    .select({
      averageRating: avg(feedback.rating),
      totalFeedback: count(feedback.id),
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "assistant")
      )
    );

  // Get rating distribution
  const ratingDistribution = await db
    .select({
      rating: feedback.rating,
      count: count(feedback.id),
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "assistant")
      )
    )
    .groupBy(feedback.rating)
    .orderBy(feedback.rating);

  // Get recent feedback with comments
  const recentComments = await db
    .select({
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      messageContent: chatMessages.content,
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "assistant")
      )
    )
    .orderBy(desc(feedback.createdAt))
    .limit(10);

  return {
    averageRating: Number(stats[0]?.averageRating || 0),
    totalFeedback: Number(stats[0]?.totalFeedback || 0),
    ratingDistribution,
    recentComments: recentComments.filter(c => c.comment),
  };
}

/**
 * Export feedback data for a tenant (GDPR compliance)
 */
export async function exportTenantFeedback(tenantId: string) {
  await requireAuth(tenantId, "admin");

  const feedbackData = await db
    .select({
      id: feedback.id,
      messageId: feedback.messageId,
      userId: feedback.userId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      messageContent: chatMessages.content,
      messageCreatedAt: chatMessages.createdAt,
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .orderBy(desc(feedback.createdAt));

  // Convert to CSV format
  const csvHeaders = [
    "Feedback ID",
    "Message ID", 
    "User ID",
    "Rating",
    "Comment",
    "Feedback Date",
    "Message Content",
    "Message Date"
  ];

  const csvRows = feedbackData.map(row => [
    row.id,
    row.messageId,
    row.userId,
    row.rating.toString(),
    row.comment || "",
    row.createdAt?.toISOString() || "",
    row.messageContent.replace(/"/g, '""'), // Escape quotes
    row.messageCreatedAt?.toISOString() || "",
  ]);

  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map(row => 
      row.map(cell => `"${cell}"`).join(",")
    )
  ].join("\n");

  return {
    filename: `feedback-export-${tenantId}-${new Date().toISOString().split('T')[0]}.csv`,
    content: csvContent,
    mimeType: "text/csv",
  };
}

/**
 * Delete feedback (GDPR compliance)
 */
export async function deleteFeedback(feedbackId: string) {
  const user = await requireAuth();

  // Verify user owns this feedback
  const [feedbackRecord] = await db
    .select({ userId: feedback.userId })
    .from(feedback)
    .where(eq(feedback.id, feedbackId))
    .limit(1);

  if (!feedbackRecord || feedbackRecord.userId !== user.id) {
    throw new Error("Access denied");
  }

  await db
    .delete(feedback)
    .where(eq(feedback.id, feedbackId));

  return { success: true };
}

/**
 * Delete all feedback for a user (GDPR compliance)
 */
export async function deleteUserFeedback(userId: string, tenantId?: string) {
  const currentUser = await requireAuth();

  // Only allow users to delete their own feedback, or admins to delete within their tenant
  if (currentUser.id !== userId) {
    if (tenantId) {
      await requireAuth(tenantId, "admin");
    } else {
      throw new Error("Access denied");
    }
  }

  await db
    .delete(feedback)
    .where(eq(feedback.userId, userId));

  return { success: true };
} 