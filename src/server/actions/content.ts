"use server";

import { put, del } from "@vercel/blob";
import { db } from "@/server/db";
import { documents, analytics } from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "./auth";
import { chunkAndEmbedDocument } from "@/lib/embeddings";
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
    'application/pdf'
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf)$/i)) {
    throw new Error("Unsupported file type. Please upload TXT, MD, or PDF files.");
  }

  try {
    console.log("☁️ Uploading to Vercel Blob...");
    // Upload file to Vercel Blob with random suffix to avoid duplicates
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    console.log("✅ Blob uploaded:", blob.url);

    // Extract text content based on file type
    let content: string;
    try {
      if (file.type === "application/pdf") {
        // Use Langchain PDFLoader for PDF files
        const { PDFLoader } = await import("@langchain/community/document_loaders/fs/pdf");
        
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Create a temporary blob URL for the PDFLoader
        const blob = new Blob([buffer], { type: 'application/pdf' });
        
        // PDFLoader expects a path, but we can pass it buffer data
        // We'll use a workaround by creating the loader with buffer data
        const loader = new PDFLoader(blob);
        const docs = await loader.load();
        
        // Combine all pages into single content
        content = docs.map(doc => doc.pageContent).join('\n');
        console.log("📄 PDF content extracted, length:", content.length, "pages:", docs.length);
      } else {
        // Use text() for other file types
        content = await file.text();
        console.log("📄 Text content extracted, length:", content.length);
      }
    } catch (error) {
      console.error("Content extraction error:", error);
      throw new Error(`Failed to extract text from ${file.type} file. Please ensure the file is valid.`);
    }

    if (!content.trim()) {
      throw new Error("Document appears to be empty or contains no readable text.");
    }

    // Clean content to remove null bytes and other problematic characters for PostgreSQL
    content = content
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Replace other control characters with spaces
      .replace(/[^\x20-\x7E\s]/g, ' ') // Replace non-printable characters with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Validate that we have readable content
    const readableCharCount = (content.match(/[a-zA-Z0-9]/g) || []).length;
    const totalCharCount = content.length;
    const readableRatio = totalCharCount > 0 ? readableCharCount / totalCharCount : 0;
    
    console.log(`📊 Content analysis: ${readableCharCount}/${totalCharCount} readable chars (${(readableRatio * 100).toFixed(1)}%)`);
    
    if (readableRatio < 0.5) {
      throw new Error("Document appears to contain mostly non-readable content. Please ensure it's a valid text-based PDF.");
    }

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

    // Store document chunks in database with pgvector embeddings
    const documentInserts = chunks.map((chunk, index) => ({
      tenantId,
      name: index === 0 ? name.trim() : `${name.trim()} (chunk ${index + 1})`,
      content: chunk.content.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim(),
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      chunkIndex: index,
      embedding: chunk.embedding, // Direct array - pgvector handles the conversion
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
      updateData.embedding = chunks[0].embedding; // Direct array for pgvector
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

  revalidatePath(`/t/${tenantId}/kb`);
  return { success: true };
}

/**
 * Rename a document and all its chunks
 */
export async function renameDocument(
  tenantId: string,
  documentId: string,
  newName: string
) {
  await requireAuth(tenantId, "contributor");

  try {
    // First, get the document to find the fileUrl and related chunks
    const [targetDoc] = await db
      .select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.tenantId, tenantId),
          eq(documents.isActive, true)
        )
      )
      .limit(1);

    if (!targetDoc) {
      throw new Error("Document not found");
    }

    // Get the base document name (without chunk suffix)
    const baseName = targetDoc.name.replace(/ \(chunk \d+\)$/, "");

    console.log(`📝 Renaming document: ${baseName} → ${newName}`);

    // Strategy: Find all chunks that belong to this specific document
    // We'll be more specific than just fileUrl to avoid renaming unrelated documents
    let chunksToUpdate = [];

    if (targetDoc.fileUrl) {
      // Find all chunks that belong to this document by fileUrl AND name pattern
      const allChunksWithFileUrl = await db
        .select({
          id: documents.id,
          name: documents.name,
          chunkIndex: documents.chunkIndex,
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.fileUrl, targetDoc.fileUrl),
            eq(documents.isActive, true)
          )
        );

      // Filter to only chunks that match the specific document name pattern
      chunksToUpdate = allChunksWithFileUrl.filter(chunk => {
        const chunkBaseName = chunk.name.replace(/ \(chunk \d+\)$/, "");
        return chunkBaseName === baseName;
      });
    } else {
      // Fallback: find all chunks by name pattern only
      const allDocs = await db
        .select({
          id: documents.id,
          name: documents.name,
          chunkIndex: documents.chunkIndex,
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.isActive, true)
          )
        );

      // Filter to only chunks that match the base name
      chunksToUpdate = allDocs.filter(chunk => {
        const chunkBaseName = chunk.name.replace(/ \(chunk \d+\)$/, "");
        return chunkBaseName === baseName;
      });
    }

    console.log(`📝 Updating ${chunksToUpdate.length} chunks for document: ${baseName}`);

    if (chunksToUpdate.length === 0) {
      throw new Error("No document chunks found to rename");
    }

    // Update in batches for efficiency
    const batchSize = 100;
    for (let i = 0; i < chunksToUpdate.length; i += batchSize) {
      const batch = chunksToUpdate.slice(i, i + batchSize);
      
      // Update this batch
      await Promise.all(
        batch.map(chunk => {
          const chunkIndex = chunk.chunkIndex ?? 0;
          const newChunkName = chunkIndex === 0 ? 
            newName.trim() : 
            `${newName.trim()} (chunk ${chunkIndex + 1})`;

          return db
            .update(documents)
            .set({
              name: newChunkName,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, chunk.id));
        })
      );
      
      console.log(`📝 Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunksToUpdate.length / batchSize)}`);
    }

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      eventType: "rename",
      eventData: {
        oldName: baseName,
        newName: newName.trim(),
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    console.log(`✅ Document renamed successfully: ${baseName} → ${newName}`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Rename error:", error);
    throw new Error(error.message || "Failed to rename document");
  }
}

/**
 * Replace a document with a new version (version control)
 */
export async function replaceDocument(
  tenantId: string,
  documentId: string,
  formData: FormData
) {
  console.log(`🔄 Starting replace for documentId: ${documentId}`);
  await requireAuth(tenantId, "contributor");

  try {
    // First, get the existing document to find related chunks
    const [targetDoc] = await db
      .select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
        version: documents.version,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.tenantId, tenantId),
          eq(documents.isActive, true)
        )
      )
      .limit(1);

    if (!targetDoc) {
      throw new Error("Document not found");
    }

    // Get the base document name (without chunk suffix)
    const baseName = targetDoc.name.replace(/ \(chunk \d+\)$/, "");
    const newVersion = (targetDoc.version ?? 1) + 1;

    // Get file from form data
    const file = formData.get("file") as File;
    const name = formData.get("name") as string || baseName;

    console.log(`📁 Replace file details:`, { name: file?.name, size: file?.size, type: file?.type });

    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File size must be less than 10MB");
    }

    // Mark old version as inactive (soft delete for version control)
    if (targetDoc.fileUrl) {
      await db
        .update(documents)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.fileUrl, targetDoc.fileUrl)
          )
        );
      console.log(`📝 Marked old version as inactive`);
    }

    console.log(`🔄 Replacing document "${baseName}" with version ${newVersion}`);

    // Upload new file to Vercel Blob
    console.log("☁️ Uploading replacement file to Vercel Blob...");
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    console.log("✅ Replacement blob uploaded:", blob.url);

    // Extract text content based on file type
    let content: string;
    try {
      if (file.type === "application/pdf") {
        // Use Langchain PDFLoader for PDF files
        const { PDFLoader } = await import("@langchain/community/document_loaders/fs/pdf");
        
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Create a temporary blob URL for the PDFLoader
        const blob = new Blob([buffer], { type: 'application/pdf' });
        
        // PDFLoader expects a path, but we can pass it buffer data
        const loader = new PDFLoader(blob);
        const docs = await loader.load();
        
        // Combine all pages into single content
        content = docs.map(doc => doc.pageContent).join('\n');
        console.log("📄 PDF replacement content extracted, length:", content.length, "pages:", docs.length);
      } else {
        // Use text() for other file types
        content = await file.text();
        console.log("📄 Text replacement content extracted, length:", content.length);
      }
    } catch (error) {
      console.error("Replacement content extraction error:", error);
      throw new Error(`Failed to extract text from ${file.type} file. Please ensure the file is valid.`);
    }

    if (!content.trim()) {
      throw new Error("Document appears to be empty or contains no readable text.");
    }

    // Clean content
    content = content
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/[^\x20-\x7E\s]/g, ' ') // Replace non-printable characters with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Validate that we have readable content
    const readableCharCount = (content.match(/[a-zA-Z0-9]/g) || []).length;
    const totalCharCount = content.length;
    const readableRatio = totalCharCount > 0 ? readableCharCount / totalCharCount : 0;
    
    console.log(`📊 Replacement content analysis: ${readableCharCount}/${totalCharCount} readable chars (${(readableRatio * 100).toFixed(1)}%)`);
    
    if (readableRatio < 0.5) {
      throw new Error("Document appears to contain mostly non-readable content. Please ensure it's a valid text-based PDF.");
    }

    if (!content) {
      throw new Error("Document contains no valid text content after cleaning.");
    }

    console.log("🧠 Generating embeddings for replacement...");
    // Generate embeddings for new document chunks
    const chunks = await chunkAndEmbedDocument(content, {
      fileName: file.name,
      fileType: file.type,
      tenantId,
    });
    console.log("✅ Generated", chunks.length, "replacement chunks with embeddings");

    if (chunks.length === 0) {
      throw new Error("Failed to process document content.");
    }

    // Store new document chunks with incremented version
    const user = await requireAuth(tenantId, "contributor");
    const documentInserts = chunks.map((chunk, index) => ({
      tenantId,
      name: index === 0 ? name.trim() : `${name.trim()} (chunk ${index + 1})`,
      content: chunk.content.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim(),
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      chunkIndex: index,
      embedding: chunk.embedding, // Direct array - pgvector handles the conversion
      version: newVersion,
      uploadedBy: user.id,
    }));

    console.log("💾 Inserting", documentInserts.length, "replacement documents into database...");
    const insertedDocs = await db
      .insert(documents)
      .values(documentInserts)
      .returning();
    console.log("✅ Replacement documents inserted:", insertedDocs.length);

    // Note: We don't delete the old blob file here to preserve version history
    // The old versions should remain accessible via their original blob URLs

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      userId: user.id,
      eventType: "replace",
      eventData: {
        documentName: baseName,
        oldVersion: targetDoc.version,
        newVersion: newVersion,
        fileName: file.name,
        fileSize: file.size,
        chunksCreated: chunks.length,
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    console.log(`✅ Document "${baseName}" replaced successfully with version ${newVersion}`);
    return { success: true, documentId: insertedDocs[0]?.id, version: newVersion };
  } catch (error: any) {
    console.error("❌ Replace error:", error);
    throw new Error(error.message || "Failed to replace document");
  }
}

/**
 * Get document version history
 */
export async function getDocumentVersions(tenantId: string, documentName: string) {
  await requireAuth(tenantId, "viewer");

  try {
    console.log(`📚 Getting version history for document: ${documentName}`);
    
    // First get all versions (active and inactive) for this document name
    const allVersions = await db
      .select({
        id: documents.id,
        name: documents.name,
        version: documents.version,
        isActive: documents.isActive,
        fileUrl: documents.fileUrl,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        uploadedBy: documents.uploadedBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.chunkIndex, 0) // Only get the first chunk of each version
        )
      )
      .orderBy(desc(documents.version));

    // Filter to only versions that match the base document name
    const documentVersions = allVersions.filter(doc => {
      const baseName = doc.name.replace(/ \(chunk \d+\)$/, "");
      return baseName === documentName;
    });

    console.log(`📊 Found ${documentVersions.length} versions for document: ${documentName}`);
    return documentVersions;
  } catch (error: any) {
    console.error("❌ Error getting document versions:", error);
    throw new Error(error.message || "Failed to get document versions");
  }
}

/**
 * Revert document to a previous version
 */
export async function revertDocumentVersion(
  tenantId: string,
  documentName: string,
  targetVersion: number
) {
  await requireAuth(tenantId, "contributor");

  try {
    console.log(`🔄 Reverting document "${documentName}" to version ${targetVersion}`);
    
    // Get the target version chunks
    const targetVersionChunks = await db
      .select({
        id: documents.id,
        name: documents.name,
        content: documents.content,
        fileUrl: documents.fileUrl,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        chunkIndex: documents.chunkIndex,
        embedding: documents.embedding,
        version: documents.version,
        uploadedBy: documents.uploadedBy,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.version, targetVersion)
        )
      );

    // Filter to only chunks that match the document name
    const matchingChunks = targetVersionChunks.filter(chunk => {
      const baseName = chunk.name.replace(/ \(chunk \d+\)$/, "");
      return baseName === documentName;
    });

    if (matchingChunks.length === 0) {
      throw new Error(`Version ${targetVersion} not found for document "${documentName}"`);
    }

    // Get current active version to deactivate it
    const currentActiveChunks = await db
      .select({
        id: documents.id,
        version: documents.version,
      })
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.isActive, true)
        )
      );

    const currentDocChunks = currentActiveChunks.filter(chunk => {
      // Find chunks that belong to this document
      const matchingChunk = matchingChunks.find(mc => mc.fileUrl);
      return matchingChunk; // This is a simplified check
    });

    // Deactivate current version
    if (currentDocChunks.length > 0) {
      const currentVersion = currentDocChunks[0]?.version;
      if (currentVersion && currentVersion !== targetVersion) {
        await db
          .update(documents)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(documents.tenantId, tenantId),
              eq(documents.version, currentVersion)
            )
          );
        console.log(`📝 Deactivated current version ${currentVersion}`);
      }
    }

    // Find the highest version number to create a new version
    const allVersions = await db
      .select({
        version: documents.version,
      })
      .from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.version))
      .limit(1);

    const newVersion = (allVersions[0]?.version ?? 0) + 1;

    // Create new chunks based on the target version
    const user = await requireAuth(tenantId, "contributor");
    const newChunks = matchingChunks.map((chunk) => ({
      tenantId,
      name: chunk.name,
      content: chunk.content,
      fileUrl: chunk.fileUrl,
      fileType: chunk.fileType,
      fileSize: chunk.fileSize,
      chunkIndex: chunk.chunkIndex,
      embedding: chunk.embedding,
      version: newVersion,
      isActive: true,
      uploadedBy: user.id,
    }));

    console.log(`💾 Creating ${newChunks.length} new chunks for reverted version ${newVersion}`);
    const insertedDocs = await db
      .insert(documents)
      .values(newChunks)
      .returning();

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      userId: user.id,
      eventType: "revert",
      eventData: {
        documentName,
        fromVersion: targetVersion,
        toVersion: newVersion,
        chunksCreated: newChunks.length,
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    console.log(`✅ Document "${documentName}" reverted to version ${targetVersion} (now version ${newVersion})`);
    return { success: true, documentId: insertedDocs[0]?.id, version: newVersion };
  } catch (error: any) {
    console.error("❌ Revert error:", error);
    throw new Error(error.message || "Failed to revert document version");
  }
}

/**
 * Delete a document and all its chunks
 */
export async function deleteDocument(tenantId: string, documentId: string) {
  await requireAuth(tenantId, "contributor");

  try {
    // First, get the document to find the fileUrl and related chunks
    const [targetDoc] = await db
      .select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.tenantId, tenantId),
          eq(documents.isActive, true)
        )
      )
      .limit(1);

    if (!targetDoc) {
      throw new Error("Document not found");
    }

    // Get the base document name (without chunk suffix)
    const baseName = targetDoc.name.replace(/ \(chunk \d+\)$/, "");

    // Strategy: Find all chunks that belong to this specific document
    // We'll be more specific than just fileUrl to avoid deleting unrelated documents
    let chunksToDelete = [];

    if (targetDoc.fileUrl) {
      // Find all chunks that belong to this document by fileUrl AND name pattern
      const allChunksWithFileUrl = await db
        .select({
          id: documents.id,
          name: documents.name,
          fileUrl: documents.fileUrl,
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.isActive, true),
            eq(documents.fileUrl, targetDoc.fileUrl)
          )
        );

      // Filter to only chunks that match the specific document name pattern
      chunksToDelete = allChunksWithFileUrl.filter(chunk => {
        const chunkBaseName = chunk.name.replace(/ \(chunk \d+\)$/, "");
        return chunkBaseName === baseName;
      });
    } else {
      // Fallback: find all chunks by name pattern only
      const allDocs = await db
        .select({
          id: documents.id,
          name: documents.name,
          fileUrl: documents.fileUrl,
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.isActive, true)
          )
        );

      // Filter to only chunks that match the base name
      chunksToDelete = allDocs.filter(chunk => {
        const chunkBaseName = chunk.name.replace(/ \(chunk \d+\)$/, "");
        return chunkBaseName === baseName;
      });
    }

    console.log(`🗑️ Deleting ${chunksToDelete.length} chunks for document: ${baseName}`);

    if (chunksToDelete.length === 0) {
      throw new Error("No document chunks found to delete");
    }

    // Delete all related chunks from database by specific IDs (more precise)
    const chunkIds = chunksToDelete.map(chunk => chunk.id);
    
    await db
      .delete(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          inArray(documents.id, chunkIds)
        )
      );

    // Only delete file from Vercel Blob storage if NO OTHER documents use this fileUrl
    if (targetDoc.fileUrl) {
      // Check if any other active documents still use this fileUrl
      const remainingDocsWithSameFileUrl = await db
        .select({
          id: documents.id,
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, tenantId),
            eq(documents.isActive, true),
            eq(documents.fileUrl, targetDoc.fileUrl)
          )
        )
        .limit(1);

      if (remainingDocsWithSameFileUrl.length === 0) {
        // Safe to delete from blob storage - no other documents use this file
        try {
          console.log(`🗑️ Deleting file from blob storage: ${targetDoc.fileUrl}`);
          await del(targetDoc.fileUrl);
          console.log(`✅ File deleted from blob storage`);
        } catch (blobError) {
          console.error("⚠️ Failed to delete file from blob storage:", blobError);
          // Don't throw here - the database deletion is more important
        }
      } else {
        console.log(`⚠️ Not deleting file from blob storage - other documents still reference it`);
      }
    }

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      eventType: "delete",
      eventData: {
        documentName: baseName,
        chunksDeleted: chunksToDelete.length,
        fileUrl: targetDoc.fileUrl,
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    console.log(`✅ Document "${baseName}" deleted successfully`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Delete error:", error);
    throw new Error(error.message || "Failed to delete document");
  }
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