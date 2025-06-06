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
import { eq, and, desc, sql, isNotNull } from "drizzle-orm";
import { requireAuth } from "./auth";
import { embedQuery } from "@/lib/embeddings";
import { revalidatePath } from "next/cache";

// Initialize OpenAI Chat model
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // Cost-effective model
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// RAG prompt template
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant with access to a knowledge base. Use the provided context to answer the user's question. If the context doesn't contain enough information, say so and provide what you can based on the available context.

System Instructions: {systemPrompt}

Context from knowledge base:
{context}

User Question: {question}

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

  // Generate embedding for the user query
  const queryEmbedding = await embedQuery(message);
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to generate query embedding");
  }

  console.log(`🧠 Generated query embedding with ${queryEmbedding.length} dimensions`);

  // Convert embedding to string format for SQL
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  // Use pgvector for similarity search on documents (only where embeddings exist)
  const relevantDocs = await db
    .select({
      id: documents.id,
      content: documents.content,
      name: documents.name,
      similarity: sql<number>`1 - (${documents.embedding} <=> ${embeddingString}::vector)`.as('similarity')
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, session[0].tenantId),
        eq(documents.isActive, true),
        isNotNull(documents.embedding) // Only include documents with embeddings
      )
    )
    .orderBy(sql`${documents.embedding} <=> ${embeddingString}::vector`)
    .limit(10);

  // Use pgvector for similarity search on web analysis (only where embeddings exist)
  const relevantWebAnalyses = await db
    .select({
      id: webAnalysis.id,
      content: webAnalysis.content,
      name: webAnalysis.title,
      similarity: sql<number>`1 - (${webAnalysis.embedding} <=> ${embeddingString}::vector)`.as('similarity')
    })
    .from(webAnalysis)
    .where(
      and(
        eq(webAnalysis.tenantId, session[0].tenantId),
        eq(webAnalysis.status, "success"),
        isNotNull(webAnalysis.embedding) // Only include analyses with embeddings
      )
    )
    .orderBy(sql`${webAnalysis.embedding} <=> ${embeddingString}::vector`)
    .limit(5);

  // Combine and take top 5 results
  const allSources = [
    ...relevantDocs.map(doc => ({ ...doc, type: "document" as const })),
    ...relevantWebAnalyses.map(analysis => ({ ...analysis, type: "web-analysis" as const }))
  ];

  const topSources = allSources
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  console.log(`🔍 Found ${relevantDocs.length} documents and ${relevantWebAnalyses.length} web analyses in tenant`);
  console.log(`📝 Query: "${message}"`);
  console.log(`🎯 Top ${topSources.length} similar sources:`, 
    topSources.map(source => ({ 
      type: source.type,
      similarity: source.similarity.toFixed(3), 
      preview: source.content.substring(0, 100) + "..."
    }))
  );

  // Prepare context for the prompt with source type information
  const context = topSources
    .map((source, index) => {
      const sourceLabel = source.type === "web-analysis" ? "Web Content" : "Document";
      return `[${index + 1}] ${sourceLabel} - ${source.name}:\n${source.content}`;
    })
    .join("\n\n");

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
        contextDocs: topSources.map(source => source.id),
        similarities: topSources.map(source => source.similarity),
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
      contextDocsUsed: topSources.length,
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
    .select({ tenantId: chatSessions.tenantId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session[0]) {
    throw new Error("Chat session not found");
  }

  await requireAuth(session[0].tenantId, "admin");

  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));

  revalidatePath(`/t/${session[0].tenantId}/chat`);
  return { success: true };
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
