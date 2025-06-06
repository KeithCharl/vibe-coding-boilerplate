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
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { 
  embedQuery, 
  parseEmbedding, 
  findSimilarDocuments,
  cosineSimilarity 
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
 * Generate a title for a chat session based on the first user message
 */
export async function generateChatTitle(message: string): Promise<string> {
  try {
    // For very short messages, use them directly
    if (message.length <= 50) {
      return message.trim();
    }

    // Use AI to generate a concise, meaningful title
    const titlePrompt = `Generate a concise, meaningful title (max 8 words) for a chat conversation that starts with this user message. The title should capture the main topic or intent. Only return the title, nothing else.

User message: "${message}"

Title:`;

    try {
      const response = await llm.invoke(titlePrompt);
      const aiTitle = (response.content as string).trim();
      
      // Clean up the AI response - remove quotes and ensure reasonable length
      const cleanTitle = aiTitle
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
        .trim();
      
      // Fallback to simple title if AI response is too long or empty
      if (cleanTitle.length > 80 || cleanTitle.length === 0) {
        throw new Error("AI title too long or empty");
      }
      
      return cleanTitle;
    } catch (aiError) {
      console.warn("AI title generation failed, using fallback:", aiError);
      
      // Fallback: Extract first sentence or first few meaningful words
      const sentences = message.split(/[.!?]+/);
      const firstSentence = sentences[0]?.trim();
      
      if (firstSentence && firstSentence.length <= 60) {
        return firstSentence;
      }
      
      // Final fallback: First few words
      const words = message.trim().split(/\s+/);
      const shortTitle = words.slice(0, 6).join(" ");
      return shortTitle.length > 60 ? shortTitle.substring(0, 57) + "..." : shortTitle;
    }
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Chat";
  }
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
      tenantId: chatSessions.tenantId,
      title: chatSessions.title 
    })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== user.id) {
    throw new Error("Access denied");
  }

  // Check if this is the first message (session still has default title)
  const isFirstMessage = session.title === "New Chat";

  try {
    // Store user message
    await db.insert(chatMessages).values({
      sessionId,
      role: "user",
      content: message,
    });

    // If this is the first message, generate a title
    if (isFirstMessage) {
      const title = await generateChatTitle(message);
      await db
        .update(chatSessions)
        .set({ title })
        .where(eq(chatSessions.id, sessionId));
    }

    // Get combined system prompt from personas or fallback to tenant prompt
    let systemPrompt: string;
    try {
      systemPrompt = await getCombinedSystemPrompt(session.tenantId, sessionId);
    } catch (error) {
      console.log("No personas applied, using tenant system prompt");
      const [tenant] = await db
        .select({ systemPrompt: tenants.systemPrompt })
        .from(tenants)
        .where(eq(tenants.id, session.tenantId))
        .limit(1);
      systemPrompt = tenant?.systemPrompt || "You are a helpful AI assistant.";
    }

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
      .limit(15); // Get docs

    // Retrieve relevant web analyses
    const relevantWebAnalyses = await db
      .select({
        id: webAnalysis.id,
        content: webAnalysis.content,
        embedding: webAnalysis.embedding,
        name: webAnalysis.title,
      })
      .from(webAnalysis)
      .where(
        and(
          eq(webAnalysis.tenantId, session.tenantId),
          eq(webAnalysis.status, "success")
        )
      )
      .limit(10); // Get web analyses

    // Combine all sources with type information
    const allSources = [
      ...relevantDocs.map(doc => ({ 
        id: doc.id,
        content: doc.content,
        embedding: doc.embedding,
        name: doc.name,
        type: "document" as const 
      })),
      ...relevantWebAnalyses.map(analysis => ({ 
        id: analysis.id,
        content: analysis.content,
        embedding: analysis.embedding,
        name: analysis.name || "Web Analysis",
        type: "web-analysis" as const 
      }))
    ];

    console.log(`🔍 Found ${relevantDocs.length} documents and ${relevantWebAnalyses.length} web analyses in tenant`);
    console.log(`📝 Query: "${message}"`);

    // Find most similar content from all sources
    const sourcesWithEmbeddings = allSources
      .filter(source => source.embedding)
      .map(source => ({
        id: source.id,
        content: source.content,
        embedding: parseEmbedding(source.embedding!),
        name: source.name,
        type: source.type,
      }));

    console.log(`🧠 ${sourcesWithEmbeddings.length} sources have embeddings`);

    // Calculate similarities and preserve metadata
    const similarities = sourcesWithEmbeddings.map(source => ({
      ...source,
      similarity: cosineSimilarity(queryEmbedding, source.embedding),
    }));

    // Sort by similarity and take top 5
    const similarSources = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    console.log(`🎯 Top ${similarSources.length} similar sources:`, 
      similarSources.map(source => ({ 
        type: source.type,
        similarity: source.similarity.toFixed(3), 
        preview: source.content.substring(0, 100) + "..."
      }))
    );

    // Prepare context for the prompt with source type information
    const context = similarSources
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
          contextDocs: similarSources.map(source => source.id),
          similarities: similarSources.map(source => source.similarity),
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
        docsRetrieved: similarSources.length,
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
      contextDocs: similarSources,
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