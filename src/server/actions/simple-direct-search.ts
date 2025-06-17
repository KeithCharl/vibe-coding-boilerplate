"use server";

import { db } from "@/server/db";
import { documents, webAnalysis, knowledgeBaseReferences } from "@/server/db/schema";
import { eq, and, isNotNull, inArray, sql } from "drizzle-orm";

// Get ALL content from current KB + linked KBs (treat as one big KB)
export async function searchAcrossLinkedKBsSimple(
  tenantId: string,
  embeddingString: string,
  limit: number = 15
) {
  try {
    // Get ALL approved references (no filtering)
    const references = await db
      .select({
        targetTenantId: knowledgeBaseReferences.targetTenantId,
      })
      .from(knowledgeBaseReferences)
      .where(
        and(
          eq(knowledgeBaseReferences.sourceTenantId, tenantId),
          eq(knowledgeBaseReferences.status, "active")
        )
      );

    // Include current tenant + all linked tenants
    const allTenantIds = [tenantId, ...references.map(ref => ref.targetTenantId)];
    
    console.log(`🔗 Searching across ${allTenantIds.length} knowledge bases:`, allTenantIds);

    // Get ALL documents from all KBs (no similarity filtering - treat as one big KB)
    const allDocuments = await db
      .select({
        id: documents.id,
        content: documents.content,
        name: documents.name,
        tenantId: documents.tenantId,
        fileType: documents.fileType,
        similarity: sql<number>`1 - (${documents.embedding} <=> ${embeddingString}::vector)`.as('similarity')
      })
      .from(documents)
      .where(
        and(
          inArray(documents.tenantId, allTenantIds),
          eq(documents.isActive, true),
          isNotNull(documents.embedding)
        )
      )
      .orderBy(sql`${documents.embedding} <=> ${embeddingString}::vector`)
      .limit(limit);

    // Get ALL web analyses from all KBs  
    const allWebAnalyses = await db
      .select({
        id: webAnalysis.id,
        content: webAnalysis.content,
        title: webAnalysis.title,
        url: webAnalysis.url,
        tenantId: webAnalysis.tenantId,
        similarity: sql<number>`1 - (${webAnalysis.embedding} <=> ${embeddingString}::vector)`.as('similarity')
      })
      .from(webAnalysis)
      .where(
        and(
          inArray(webAnalysis.tenantId, allTenantIds),
          eq(webAnalysis.status, "success"),
          isNotNull(webAnalysis.embedding)
        )
      )
      .orderBy(sql`${webAnalysis.embedding} <=> ${embeddingString}::vector`)
      .limit(Math.floor(limit / 2));

    console.log(`✅ Found ${allDocuments.length} documents and ${allWebAnalyses.length} web analyses across all linked KBs`);

    return {
      documents: allDocuments,
      webAnalyses: allWebAnalyses,
      linkedKBCount: references.length
    };

  } catch (error) {
    console.error("Error in simple cross-KB search:", error);
    return {
      documents: [],
      webAnalyses: [],
      linkedKBCount: 0
    };
  }
} 