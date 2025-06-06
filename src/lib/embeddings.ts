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

// Note: Manual similarity functions removed since pgvector handles this natively
// pgvector provides much faster similarity search with native database operations 