"use server";

import { db } from "@/server/db";
import { documents, webAnalysis, knowledgeBaseReferences } from "@/server/db/schema";
import { requireAuth } from "./auth";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

// Simple function to link two knowledge bases together
export async function linkKnowledgeBases(
  fromTenantId: string,
  toTenantId: string,
  toTenantName: string
) {
  const session = await requireAuth(fromTenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    // Create a simple, wide-open reference
    const reference = await db
      .insert(knowledgeBaseReferences)
      .values({
        sourceTenantId: fromTenantId,
        targetTenantId: toTenantId,
        name: toTenantName,
        description: `Auto-linked to ${toTenantName}`,
        createdBy: session.id,
        approvedBy: session.id, // Auto-approve
        status: "active",
        isActive: true,
        weight: 1.0,
        maxResults: 100, // High limit
        minSimilarity: 0.0, // No similarity filtering - include everything!
        includeTags: [],
        excludeTags: [],
        includeDocumentTypes: null,
        excludeDocumentTypes: null,
        autoApprove: true,
        requiresReview: false,
        approvedAt: new Date(),
      })
      .returning();

    return reference[0];
  } catch (error) {
    console.error("Error linking knowledge bases:", error);
    throw new Error("Failed to link knowledge bases");
  }
}

// Simple function to get ALL content from linked KBs (no filtering)
export async function getAllContentFromLinkedKBs(tenantId: string, query?: string) {
  try {
    // Get all approved references
    const references = await db
      .select()
      .from(knowledgeBaseReferences)
      .where(
        and(
          eq(knowledgeBaseReferences.sourceTenantId, tenantId),
          eq(knowledgeBaseReferences.status, "active")
        )
      );

    if (references.length === 0) {
      return { documents: [], webAnalyses: [] };
    }

    // Get target tenant IDs
    const targetTenantIds = references.map(ref => ref.targetTenantId);
    const allTenantIds = [tenantId, ...targetTenantIds];

    // Get ALL documents from linked KBs (no similarity filtering)
    const allDocuments = await db
      .select({
        id: documents.id,
        content: documents.content,
        name: documents.name,
        tenantId: documents.tenantId,
        fileType: documents.fileType,
      })
      .from(documents)
      .where(
        and(
          inArray(documents.tenantId, allTenantIds),
          eq(documents.isActive, true),
          isNotNull(documents.content)
        )
      )
      .limit(500); // High limit but not unlimited

    // Get ALL web analyses from linked KBs
    const allWebAnalyses = await db
      .select({
        id: webAnalysis.id,
        content: webAnalysis.content,
        title: webAnalysis.title,
        url: webAnalysis.url,
        tenantId: webAnalysis.tenantId,
      })
      .from(webAnalysis)
      .where(
        and(
          inArray(webAnalysis.tenantId, allTenantIds),
          eq(webAnalysis.status, "success"),
          isNotNull(webAnalysis.content)
        )
      )
      .limit(100);

    return {
      documents: allDocuments,
      webAnalyses: allWebAnalyses,
      linkedKBs: references.map(ref => ({
        tenantId: ref.targetTenantId,
        name: ref.name
      }))
    };
  } catch (error) {
    console.error("Error getting content from linked KBs:", error);
    return { documents: [], webAnalyses: [] };
  }
}

// Update existing reference to be completely open
export async function makeReferenceCompletelyOpen(tenantId: string, referenceId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const updated = await db
      .update(knowledgeBaseReferences)
      .set({
        minSimilarity: 0.0, // No filtering
        maxResults: 100,    // High limit
        weight: 1.0,
        includeTags: [],
        excludeTags: [],
        includeDocumentTypes: null,
        excludeDocumentTypes: null,
      })
      .where(
        and(
          eq(knowledgeBaseReferences.id, referenceId),
          eq(knowledgeBaseReferences.sourceTenantId, tenantId)
        )
      )
      .returning();

    return updated[0];
  } catch (error) {
    console.error("Error updating reference:", error);
    throw new Error("Failed to update reference");
  }
} 