"use server";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { db } from "@/server/db";
import { 
  chatSessions, 
  chatMessages, 
  documents, 
  tenants,
  analytics,
  webAnalysis 
} from "@/server/db/schema";
import { getCombinedSystemPrompt } from "./personas";
import { eq, and, desc, sql, isNotNull, lt } from "drizzle-orm";
import { requireAuth, getUserRole } from "./auth";
import { embedQuery } from "@/lib/embeddings";
import { searchAcrossLinkedKBsSimple } from "./simple-direct-search";
import { revalidatePath } from "next/cache";

// Initialize OpenAI Chat model
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // Cost-effective model
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// RAG prompt template with enhanced source attribution
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant with access to multiple knowledge bases. Use the provided context to answer the user's question. When referencing information, cite the source knowledge base in brackets.

System Instructions: {systemPrompt}

Context from knowledge bases:
{context}

User Question: {question}

Instructions:
- Provide a comprehensive answer using information from all relevant sources
- When citing information, include the source in brackets like [Primary KB] or [Project Management KB]
- If you combine information from multiple sources, clearly indicate this
- If the context doesn't contain enough information, say so and provide what you can based on the available context

Answer:
`);

/**
 * Create a new chat session
 */
export async function createChatSession(tenantId: string, title?: string) {
  const user = await requireAuth(tenantId, "viewer");

  const [session] = await db
    .insert(chatSessions)
    .values({
      tenantId,
      userId: user.id,
      title: title || "New Chat",
    })
    .returning();

  return session;
}

/**
 * Get chat sessions for a tenant
 */
export async function getChatSessions(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const sessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.tenantId, tenantId))
    .orderBy(desc(chatSessions.updatedAt));

  return sessions;
}

/**
 * Get a specific chat session with messages
 */
export async function getChatSession(sessionId: string) {
  const session = await db
    .select({
      id: chatSessions.id,
      tenantId: chatSessions.tenantId,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  await requireAuth(session[0].tenantId, "viewer");

  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  return {
    ...session[0],
    messages,
  };
}

/**
 * Send a message in a chat session with RAG
 */
export async function sendMessage(sessionId: string, message: string) {
  // Get session and verify access
  const session = await db
    .select({
      id: chatSessions.id,
      tenantId: chatSessions.tenantId,
      userId: chatSessions.userId,
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  await requireAuth(session[0].tenantId, "viewer");

  // Store user message
  const [userMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      role: "user",
      content: message,
    })
    .returning();

  // Get system prompt for this tenant
  const tenant = await db
    .select({ systemPrompt: tenants.systemPrompt })
    .from(tenants)
    .where(eq(tenants.id, session[0].tenantId))
    .limit(1);

  const systemPrompt = await getCombinedSystemPrompt(session[0].tenantId, sessionId) || 
    tenant[0]?.systemPrompt || 
    "You are a helpful AI assistant with access to the knowledge base.";

  // Generate embedding for cross-KB search
  const embedding = await embedQuery(message);
  const embeddingString = `[${embedding.join(",")}]`;
  
  // Use simple cross-KB search (treat linked KBs as extensions)
  console.log(`🔍 Starting cross-KB search for tenant ${session[0].tenantId}`);
  const crossKBResults = await searchAcrossLinkedKBsSimple(
    session[0].tenantId,
    embeddingString,
    15
  );

  console.log(`📊 Cross-KB search results: ${crossKBResults.documents.length} documents, ${crossKBResults.webAnalyses.length} web analyses`);
  console.log(`🔗 Linked KBs: ${crossKBResults.linkedKBCount}`);

  // Combine and format context with source attribution
  const contextParts: string[] = [];

  if (crossKBResults.documents.length > 0) {
    contextParts.push("**Relevant Documents:**");
    crossKBResults.documents.forEach((doc, index) => {
      const kbLabel = doc.tenantId === session[0].tenantId ? "Current KB" : "Linked KB";
      contextParts.push(
        `${index + 1}. [${kbLabel}] ${doc.name}: ${doc.content.substring(0, 500)}...`
      );
    });
  }

  if (crossKBResults.webAnalyses.length > 0) {
    contextParts.push("\n**Relevant Web Content:**");
    crossKBResults.webAnalyses.forEach((analysis, index) => {
      const kbLabel = analysis.tenantId === session[0].tenantId ? "Current KB" : "Linked KB";
      contextParts.push(
        `${index + 1}. [${kbLabel}] ${analysis.title}: ${analysis.content.substring(0, 500)}...`
      );
    });
  }

  const context = contextParts.join("\n");
  const totalSources = crossKBResults.documents.length + crossKBResults.webAnalyses.length;

  console.log(`📝 Query: "${message}"`);
  console.log(`🎯 Using ${totalSources} sources from ${crossKBResults.linkedKBCount + 1} knowledge bases`);

  // Generate AI response using RAG
  const prompt = await ragPromptTemplate.format({
    systemPrompt: systemPrompt,
    context: context || "No relevant context found in the knowledge base.",
    question: message,
  });

  const response = await llm.invoke(prompt);
  const aiResponse = response.content as string;

  // Store AI response with metadata
  const [aiMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      role: "assistant",
      content: aiResponse,
      metadata: {
        contextDocs: crossKBResults.documents.map(doc => doc.id),
        contextWebAnalyses: crossKBResults.webAnalyses.map(analysis => analysis.id),
        documentSimilarities: crossKBResults.documents.map(doc => doc.similarity),
        webAnalysisSimilarities: crossKBResults.webAnalyses.map(analysis => analysis.similarity),
        linkedKBCount: crossKBResults.linkedKBCount,
        model: "gpt-4o-mini",
      },
    })
    .returning();

  // Log analytics
  await db.insert(analytics).values({
    tenantId: session[0].tenantId,
    userId: session[0].userId,
    eventType: "query",
    eventData: {
      sessionId,
      messageId: userMessage.id,
      responseId: aiMessage.id,
      contextDocsUsed: totalSources,
      documentsUsed: crossKBResults.documents.length,
      webAnalysesUsed: crossKBResults.webAnalyses.length,
      linkedKBsUsed: crossKBResults.linkedKBCount,
      queryLength: message.length,
      responseLength: aiResponse.length,
    },
  });

  revalidatePath(`/t/${session[0].tenantId}/chat/${sessionId}`);
  
  return aiMessage;
}

/**
 * Update chat session title
 */
export async function updateChatSessionTitle(sessionId: string, title: string) {
  const session = await db
    .select({ tenantId: chatSessions.tenantId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  await requireAuth(session[0].tenantId, "viewer");

  await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  revalidatePath(`/t/${session[0].tenantId}/chat`);
  return { success: true };
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string) {
  const session = await db
    .select({ 
      tenantId: chatSessions.tenantId,
      userId: chatSessions.userId 
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  const user = await requireAuth(session[0].tenantId, "viewer");
  const userRole = await getUserRole(session[0].tenantId);
  
  // Users can delete their own sessions, admins can delete any session
  if (session[0].userId !== user.id && userRole !== "admin") {
    throw new Error("You can only delete your own chat sessions");
  }

  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));

  revalidatePath(`/t/${session[0].tenantId}/chat`);
  return { success: true };
}

/**
 * Bulk delete old chat sessions
 */
export async function deleteOldChatSessions(tenantId: string, cutoffDate: Date) {
  const user = await requireAuth(tenantId, "viewer");
  const userRole = await getUserRole(tenantId);
  
  // Build the where clause based on user permissions
  let whereClause;
  if (userRole === "admin") {
    // Admins can delete any old sessions in their tenant
    whereClause = and(
      eq(chatSessions.tenantId, tenantId),
      lt(chatSessions.updatedAt, cutoffDate)
    );
  } else {
    // Regular users can only delete their own old sessions
    whereClause = and(
      eq(chatSessions.tenantId, tenantId),
      eq(chatSessions.userId, user.id),
      lt(chatSessions.updatedAt, cutoffDate)
    );
  }

  // Get sessions to be deleted for counting
  const sessionsToDelete = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(whereClause);

  const deletedCount = sessionsToDelete.length;

  // Delete the sessions
  await db.delete(chatSessions).where(whereClause);

  revalidatePath(`/t/${tenantId}/chat`);
  return { success: true, deletedCount };
}

/**
 * Get chat analytics for a tenant
 */
export async function getChatAnalytics(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const queryAnalytics = await db
    .select({
      eventData: analytics.eventData,
      createdAt: analytics.createdAt,
    })
    .from(analytics)
    .where(
      and(
        eq(analytics.tenantId, tenantId),
        eq(analytics.eventType, "query")
      )
    )
    .orderBy(desc(analytics.createdAt))
    .limit(100);

  return queryAnalytics;
}

/**
 * Toggle bookmark status for a chat session
 */
export async function toggleChatBookmark(sessionId: string) {
  const session = await db
    .select({ 
      tenantId: chatSessions.tenantId,
      isBookmarked: chatSessions.isBookmarked 
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  await requireAuth(session[0].tenantId, "viewer");

  const newBookmarkStatus = !session[0].isBookmarked;

  await db
    .update(chatSessions)
    .set({ 
      isBookmarked: newBookmarkStatus,
      updatedAt: new Date() 
    })
    .where(eq(chatSessions.id, sessionId));

  revalidatePath(`/t/${session[0].tenantId}/chat`);
  revalidatePath(`/t/${session[0].tenantId}/chat/${sessionId}`);
  
  return { success: true, isBookmarked: newBookmarkStatus };
}

/**
 * Get bookmarked chat sessions for a tenant
 */
export async function getBookmarkedChatSessions(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const bookmarkedSessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      isBookmarked: chatSessions.isBookmarked,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatSessions.isBookmarked, true)
      )
    )
    .orderBy(desc(chatSessions.updatedAt));

  return bookmarkedSessions;
}
