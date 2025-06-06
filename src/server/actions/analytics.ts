"use server";

import { db } from "@/server/db";
import { 
  analytics, 
  chatMessages, 
  chatSessions, 
  documents, 
  users,
  feedback
} from "@/server/db/schema";
import { eq, and, desc, count, sql, like } from "drizzle-orm";
import { requireAuth } from "./auth";

export interface DocumentUsage {
  documentId: string;
  documentName: string;
  usageCount: number;
  lastUsed: Date;
  fileType?: string;
}

export interface PopularQuery {
  query: string;
  count: number;
  lastUsed: Date;
  averageRating?: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  messagesCount: number;
  feedbackCount: number;
  lastActivity: Date;
}

export interface AnalyticsOverview {
  totalQueries: number;
  totalFeedback: number;
  activeUsers: number;
  documentsReferenced: number;
  averageSessionLength: number;
}

/**
 * Get document usage analytics for a tenant
 */
export async function getDocumentUsageAnalytics(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  // Get document usage from analytics events
  const documentUsage = await db
    .select({
      documentId: sql<string>`(analytics.event_data->>'documentId')`,
      documentName: documents.name,
      usageCount: count(analytics.id),
      lastUsed: sql<Date>`MAX(analytics.created_at)`,
      fileType: documents.fileType,
    })
    .from(analytics)
    .innerJoin(
      documents, 
      sql`documents.id = (analytics.event_data->>'documentId')::uuid`
    )
    .where(
      and(
        eq(analytics.tenantId, tenantId),
        eq(analytics.eventType, "query"),
        sql`analytics.event_data->>'documentId' IS NOT NULL`
      )
    )
    .groupBy(sql`analytics.event_data->>'documentId'`, documents.name, documents.fileType)
    .orderBy(desc(count(analytics.id)))
    .limit(50);

  return documentUsage as DocumentUsage[];
}

/**
 * Get popular queries/prompts analytics for a tenant
 */
export async function getPopularQueriesAnalytics(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  // Get popular queries from chat messages
  const popularQueries = await db
    .select({
      query: chatMessages.content,
      count: count(chatMessages.id),
      lastUsed: sql<Date>`MAX(chat_messages.created_at)`,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "user"),
        sql`LENGTH(chat_messages.content) > 10` // Filter out very short queries
      )
    )
    .groupBy(chatMessages.content)
    .having(sql`COUNT(*) > 1`) // Only show queries that appear more than once
    .orderBy(desc(count(chatMessages.id)))
    .limit(20);

  return popularQueries as PopularQuery[];
}

/**
 * Get user activity analytics for a tenant
 */
export async function getUserActivityAnalytics(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  const userActivity = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      messagesCount: count(chatMessages.id),
      lastActivity: sql<Date>`MAX(chat_messages.created_at)`,
    })
    .from(users)
    .innerJoin(chatSessions, eq(users.id, chatSessions.userId))
    .leftJoin(chatMessages, eq(chatSessions.id, chatMessages.sessionId))
    .where(eq(chatSessions.tenantId, tenantId))
    .groupBy(users.id, users.name, users.email, users.image)
    .orderBy(desc(count(chatMessages.id)))
    .limit(50);

  // Get feedback counts for each user
  const feedbackCounts = await db
    .select({
      userId: feedback.userId,
      feedbackCount: count(feedback.id),
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatSessions.tenantId, tenantId))
    .groupBy(feedback.userId);

  // Merge feedback counts with user activity
  const userActivityWithFeedback = userActivity.map(user => {
    const feedbackData = feedbackCounts.find(f => f.userId === user.userId);
    return {
      ...user,
      feedbackCount: feedbackData?.feedbackCount || 0,
    };
  });

  return userActivityWithFeedback as UserActivity[];
}

/**
 * Get analytics overview for a tenant
 */
export async function getAnalyticsOverview(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  // Total queries
  const totalQueries = await db
    .select({ count: count(chatMessages.id) })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "user")
      )
    );

  // Total feedback
  const totalFeedback = await db
    .select({ count: count(feedback.id) })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatSessions.tenantId, tenantId));

  // Active users (users who sent messages in last 30 days)
  const activeUsers = await db
    .select({ count: sql<number>`COUNT(DISTINCT chat_sessions.user_id)` })
    .from(chatSessions)
    .innerJoin(chatMessages, eq(chatSessions.id, chatMessages.sessionId))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        sql`chat_messages.created_at > NOW() - INTERVAL '30 days'`
      )
    );

  // Documents referenced in queries
  const documentsReferenced = await db
    .select({ 
      count: sql<number>`COUNT(DISTINCT (analytics.event_data->>'documentId'))` 
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.tenantId, tenantId),
        eq(analytics.eventType, "query"),
        sql`analytics.event_data->>'documentId' IS NOT NULL`
      )
    );

  return {
    totalQueries: Number(totalQueries[0]?.count || 0),
    totalFeedback: Number(totalFeedback[0]?.count || 0),
    activeUsers: Number(activeUsers[0]?.count || 0),
    documentsReferenced: Number(documentsReferenced[0]?.count || 0),
    averageSessionLength: 0, // TODO: Calculate this based on session duration
  } as AnalyticsOverview;
}

/**
 * Get trending topics/keywords analytics
 */
export async function getTrendingTopicsAnalytics(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  // Get common keywords/phrases from user queries
  const recentQueries = await db
    .select({
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatMessages.role, "user"),
        sql`chat_messages.created_at > NOW() - INTERVAL '7 days'`
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(1000);

  // This would benefit from a more sophisticated text analysis
  // For now, we'll return the raw data for client-side processing
  return recentQueries;
}

/**
 * Get feedback sentiment analysis
 */
export async function getFeedbackSentimentAnalytics(tenantId: string) {
  await requireAuth(tenantId, "contributor");

  const sentimentData = await db
    .select({
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(feedback)
    .innerJoin(chatMessages, eq(feedback.messageId, chatMessages.id))
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .innerJoin(users, eq(feedback.userId, users.id))
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        sql`feedback.comment IS NOT NULL AND feedback.comment != ''`
      )
    )
    .orderBy(desc(feedback.createdAt))
    .limit(100);

  return sentimentData;
} 