import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small", // More cost-effective than ada-002
});

// Text splitter for chunking documents
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

export interface DocumentChunk {
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

/**
 * Chunk and embed a document
 */
export async function chunkAndEmbedDocument(
  content: string,
  metadata?: Record<string, any>
): Promise<DocumentChunk[]> {
  try {
    // Split the document into chunks
    const docs = await textSplitter.createDocuments([content], [metadata || {}]);
    
    // Generate embeddings for each chunk
    const chunks: DocumentChunk[] = [];
    
    for (const doc of docs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      chunks.push({
        content: doc.pageContent,
        embedding,
        metadata: doc.metadata,
      });
    }
    
    return chunks;
  } catch (error) {
    console.error("Error chunking and embedding document:", error);
    throw new Error("Failed to process document");
  }
}

/**
 * Generate embedding for a single query
 */
export async function embedQuery(query: string): Promise<number[]> {
  try {
    return await embeddings.embedQuery(query);
  } catch (error) {
    console.error("Error embedding query:", error);
    throw new Error("Failed to embed query");
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar documents using cosine similarity
 */
export function findSimilarDocuments(
  queryEmbedding: number[],
  documents: Array<{ embedding: number[]; content: string; id: string }>,
  topK: number = 5
): Array<{ content: string; id: string; similarity: number }> {
  const similarities = documents.map(doc => ({
    ...doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Parse embedding from database (stored as JSON string)
 */
export function parseEmbedding(embeddingStr: string): number[] {
  try {
    return JSON.parse(embeddingStr);
  } catch (error) {
    throw new Error("Invalid embedding format");
  }
}

/**
 * Serialize embedding for database storage
 */
export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
} 