"use server";

import { put } from "@vercel/blob";
import { db } from "@/server/db";
import { documents, analytics } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { chunkAndEmbedDocument, serializeEmbedding } from "@/lib/embeddings";
import { revalidatePath } from "next/cache";

export interface DocumentData {
  id: string;
  name: string;
  content: string;
  summary?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  version: number;
  isActive: boolean;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Upload and process a document
 */
export async function uploadDocument(
  tenantId: string,
  formData: FormData
) {
  console.log("🚀 Starting upload for tenantId:", tenantId);
  const user = await requireAuth(tenantId, "contributor");
  console.log("✅ User authenticated:", user.id);
  
  const file = formData.get("file") as File;
  const name = formData.get("name") as string || file.name;
  
  console.log("📁 File details:", { name: file.name, size: file.size, type: file.type });
  
  if (!file) {
    throw new Error("No file provided");
  }

  if (!name?.trim()) {
    throw new Error("Document name is required");
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File size must be less than 10MB");
  }

  // Validate file type
  const allowedTypes = [
    'text/plain', 
    'text/markdown', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|doc|docx)$/i)) {
    throw new Error("Unsupported file type. Please upload TXT, MD, PDF, DOC, or DOCX files.");
  }

  try {
    console.log("☁️ Uploading to Vercel Blob...");
    // Upload file to Vercel Blob with random suffix to avoid duplicates
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    console.log("✅ Blob uploaded:", blob.url);

    // Extract text content (for now, assume plain text - can extend for PDF, etc.)
    let content: string;
    try {
      content = await file.text();
      console.log("📄 Content extracted, length:", content.length);
    } catch (error) {
      throw new Error("Failed to extract text from file. Please ensure the file is a valid text document.");
    }

    if (!content.trim()) {
      throw new Error("Document appears to be empty or contains no readable text.");
    }

    // Clean content to remove null bytes and other problematic characters for PostgreSQL
    content = content
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Replace other control characters with spaces
      .trim();

    if (!content) {
      throw new Error("Document contains no valid text content after cleaning.");
    }

    console.log("🧠 Generating embeddings...");
    // Generate embeddings for document chunks
    const chunks = await chunkAndEmbedDocument(content, {
      fileName: file.name,
      fileType: file.type,
      tenantId,
    });
    console.log("✅ Generated", chunks.length, "chunks with embeddings");

    if (chunks.length === 0) {
      throw new Error("Failed to process document content.");
    }

    // Store document chunks in database
    const documentInserts = chunks.map((chunk, index) => ({
      tenantId,
      name: index === 0 ? name.trim() : `${name.trim()} (chunk ${index + 1})`,
      content: chunk.content.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim(),
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      chunkIndex: index,
      embedding: serializeEmbedding(chunk.embedding),
      uploadedBy: user.id,
    }));

    console.log("💾 Inserting", documentInserts.length, "documents into database...");
    const insertedDocs = await db
      .insert(documents)
      .values(documentInserts)
      .returning();

    console.log("✅ Documents inserted:", insertedDocs.length);

    if (insertedDocs.length === 0) {
      throw new Error("Failed to save document to database.");
    }

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      userId: user.id,
      eventType: "upload",
      eventData: {
        documentId: insertedDocs[0]?.id,
        fileName: file.name,
        fileSize: file.size,
        chunksCreated: chunks.length,
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    console.log("🎉 Upload completed successfully!");
    return { success: true, documentId: insertedDocs[0]?.id };
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    
    // If error has a message, use it, otherwise provide a generic message
    const errorMessage = error.message || "Failed to upload document";
    throw new Error(errorMessage);
  }
}

/**
 * Get documents for a tenant
 */
export async function getDocuments(tenantId: string) {
  console.log("📋 Getting documents for tenantId:", tenantId);
  await requireAuth(tenantId, "viewer");

  const docs = await db
    .select({
      id: documents.id,
      name: documents.name,
      content: documents.content,
      summary: documents.summary,
      fileUrl: documents.fileUrl,
      fileType: documents.fileType,
      fileSize: documents.fileSize,
      chunkIndex: documents.chunkIndex,
      version: documents.version,
      isActive: documents.isActive,
      uploadedBy: documents.uploadedBy,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, tenantId), eq(documents.isActive, true)))
    .orderBy(desc(documents.createdAt));

  console.log("📊 Found", docs.length, "document chunks from database");

  // Group chunks by base document name
  const groupedDocs = docs.reduce((acc, doc) => {
    const baseName = doc.name.replace(/ \(chunk \d+\)$/, "");
    if (!acc[baseName]) {
      acc[baseName] = {
        id: doc.id,
        name: baseName,
        chunks: [],
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        version: doc.version,
        uploadedBy: doc.uploadedBy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
    acc[baseName].chunks.push({
      id: doc.id,
      content: doc.content,
      chunkIndex: doc.chunkIndex,
    });
    return acc;
  }, {} as Record<string, any>);

  const result = Object.values(groupedDocs);
  console.log("📚 Returning", result.length, "grouped documents");
  return result;
}

/**
 * Get a specific document by ID
 */
export async function getDocument(tenantId: string, documentId: string) {
  await requireAuth(tenantId, "viewer");

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.tenantId, tenantId),
        eq(documents.isActive, true)
      )
    )
    .limit(1);

  return doc;
}

/**
 * Update document content
 */
export async function updateDocument(
  tenantId: string,
  documentId: string,
  data: { name?: string; content?: string; summary?: string }
) {
  await requireAuth(tenantId, "contributor");

  // If content is updated, regenerate embeddings
  let updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  if (data.content) {
    const chunks = await chunkAndEmbedDocument(data.content);
    if (chunks.length > 0) {
      updateData.embedding = serializeEmbedding(chunks[0].embedding);
    }
  }

  await db
    .update(documents)
    .set(updateData)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.tenantId, tenantId)
      )
    );

  revalidatePath(`/kb`);
  return { success: true };
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(tenantId: string, documentId: string) {
  await requireAuth(tenantId, "contributor");

  await db
    .update(documents)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.tenantId, tenantId)
      )
    );

  revalidatePath(`/kb`);
  return { success: true };
}

/**
 * Search documents by content similarity
 */
export async function searchDocuments(
  tenantId: string,
  query: string,
  limit: number = 10
) {
  await requireAuth(tenantId, "viewer");

  // For now, simple text search - will enhance with embedding similarity
  const docs = await db
    .select({
      id: documents.id,
      name: documents.name,
      content: documents.content,
      chunkIndex: documents.chunkIndex,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, tenantId),
        eq(documents.isActive, true)
      )
    )
    .limit(limit);

  // Filter by text content for now
  const filteredDocs = docs.filter(doc =>
    doc.content.toLowerCase().includes(query.toLowerCase())
  );

  return filteredDocs;
}

/**
 * Get document statistics for a tenant
 */
export async function getDocumentStats(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const stats = await db
    .select({
      count: documents.id,
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, tenantId),
        eq(documents.isActive, true)
      )
    );

  return {
    totalDocuments: stats.length,
    totalChunks: stats.length,
  };
} 