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
  analytics 
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { 
  embedQuery, 
  parseEmbedding, 
  findSimilarDocuments 
} from "@/lib/embeddings";
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
 * Get chat sessions for a tenant/user
 */
export async function getChatSessions(tenantId: string) {
  const user = await requireAuth(tenantId, "viewer");

  const sessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.tenantId, tenantId),
        eq(chatSessions.userId, user.id)
      )
    )
    .orderBy(desc(chatSessions.updatedAt));

  return sessions;
}

/**
 * Get messages for a chat session
 */
export async function getChatMessages(sessionId: string) {
  const user = await requireAuth();

  // Verify user owns this session
  const [session] = await db
    .select({ userId: chatSessions.userId, tenantId: chatSessions.tenantId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== user.id) {
    throw new Error("Access denied");
  }

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

  return messages;
}

/**
 * Send a message and get AI response with RAG
 */
export async function sendMessage(sessionId: string, message: string) {
  const user = await requireAuth();

  // Get session and verify access
  const [session] = await db
    .select({ 
      userId: chatSessions.userId, 
      tenantId: chatSessions.tenantId 
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== user.id) {
    throw new Error("Access denied");
  }

  try {
    // Store user message
    await db.insert(chatMessages).values({
      sessionId,
      role: "user",
      content: message,
    });

    // Get tenant system prompt
    const [tenant] = await db
      .select({ systemPrompt: tenants.systemPrompt })
      .from(tenants)
      .where(eq(tenants.id, session.tenantId))
      .limit(1);

    // Generate embedding for the query
    const queryEmbedding = await embedQuery(message);

    // Retrieve relevant documents
    const relevantDocs = await db
      .select({
        id: documents.id,
        content: documents.content,
        embedding: documents.embedding,
        name: documents.name,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, session.tenantId),
          eq(documents.isActive, true)
        )
      )
      .limit(20); // Get more docs to find best matches

    // Find most similar documents
    const docsWithEmbeddings = relevantDocs
      .filter(doc => doc.embedding)
      .map(doc => ({
        id: doc.id,
        content: doc.content,
        embedding: parseEmbedding(doc.embedding!),
      }));

    const similarDocs = findSimilarDocuments(
      queryEmbedding,
      docsWithEmbeddings,
      5 // Top 5 most relevant chunks
    );

    // Prepare context for the prompt
    const context = similarDocs
      .map((doc, index) => `[${index + 1}] ${doc.content}`)
      .join("\n\n");

    // Generate AI response using RAG
    const prompt = await ragPromptTemplate.format({
      systemPrompt: tenant?.systemPrompt || "You are a helpful AI assistant.",
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
          contextDocs: similarDocs.map(doc => doc.id),
          similarities: similarDocs.map(doc => doc.similarity),
          model: "gpt-4o-mini",
        },
      })
      .returning();

    // Log analytics
    await db.insert(analytics).values({
      tenantId: session.tenantId,
      userId: user.id,
      eventType: "query",
      eventData: {
        sessionId,
        messageId: aiMessage.id,
        queryLength: message.length,
        responseLength: aiResponse.length,
        docsRetrieved: similarDocs.length,
      },
    });

    // Update session timestamp
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    revalidatePath(`/chat/${sessionId}`);
    
    return {
      success: true,
      message: aiMessage,
      contextDocs: similarDocs,
    };

  } catch (error) {
    console.error("Chat error:", error);
    throw new Error("Failed to process message");
  }
}

/**
 * Update chat session title
 */
export async function updateChatSession(
  sessionId: string, 
  data: { title?: string }
) {
  const user = await requireAuth();

  // Verify user owns this session
  const [session] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== user.id) {
    throw new Error("Access denied");
  }

  await db
    .update(chatSessions)
    .set({ 
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));

  revalidatePath(`/chat`);
  return { success: true };
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string) {
  const user = await requireAuth();

  // Verify user owns this session
  const [session] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== user.id) {
    throw new Error("Access denied");
  }

  // Delete messages first (cascade should handle this, but being explicit)
  await db
    .delete(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId));

  // Delete session
  await db
    .delete(chatSessions)
    .where(eq(chatSessions.id, sessionId));

  revalidatePath(`/chat`);
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