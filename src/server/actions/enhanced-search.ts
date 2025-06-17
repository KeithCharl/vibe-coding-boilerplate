"use server";

import { db } from "@/server/db";
import { 
  documents, 
  webAnalysis, 
  knowledgeBaseReferences,
  tenants,
  documentTags
} from "@/server/db/schema";
import { eq, and, sql, isNotNull, inArray, or } from "drizzle-orm";
import { embedQuery } from "@/lib/embeddings";
import { logReferenceUsage } from "./kb-references";

interface CrossKBSearchResult {
  documents: Array<{
    id: string;
    content: string;
    name: string;
    similarity: number;
    sourceTenantId: string;
    sourceTenantName: string;
    weight: number;
    fileType?: string;
    tags?: string[];
  }>;
  webAnalyses: Array<{
    id: string;
    content: string;
    title: string;
    url: string;
    similarity: number;
    sourceTenantId: string;
    sourceTenantName: string;
    weight: number;
  }>;
  referencesUsed: Array<{
    referenceId: string;
    tenantName: string;
    documentsFound: number;
    webAnalysesFound: number;
  }>;
  performanceMetrics: {
    totalQueryTime: number;
    embeddingTime: number;
    searchTime: number;
    totalResults: number;
  };
}

/**
 * Enhanced RAG search that includes referenced knowledge bases
 */
export async function searchAcrossKnowledgeBases(
  tenantId: string,
  query: string,
  options: {
    maxResults?: number;
    minSimilarity?: number;
    includeReferences?: boolean;
    sessionId?: string;
    userId?: string;
  } = {}
): Promise<CrossKBSearchResult> {
  const startTime = Date.now();
  
  const {
    maxResults = 15,
    minSimilarity = 0.1,
    includeReferences = true,
    sessionId,
    userId
  } = options;

  console.log(`🔍 Starting cross-KB search for tenant ${tenantId}, query: "${query.substring(0, 100)}..."`);

  // Generate embedding for the query
  const embeddingStartTime = Date.now();
  const queryEmbedding = await embedQuery(query);
  const embeddingTime = Date.now() - embeddingStartTime;
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to generate query embedding");
  }

  console.log(`🧠 Generated query embedding in ${embeddingTime}ms`);

  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  // Get active references for this tenant
  const searchStartTime = Date.now();
  const activeReferences = includeReferences ? await db
    .select({
      id: knowledgeBaseReferences.id,
      targetTenantId: knowledgeBaseReferences.targetTenantId,
      targetTenantName: tenants.name,
      weight: knowledgeBaseReferences.weight,
      maxResults: knowledgeBaseReferences.maxResults,
      minSimilarity: knowledgeBaseReferences.minSimilarity,
      includeTags: knowledgeBaseReferences.includeTags,
      excludeTags: knowledgeBaseReferences.excludeTags,
      includeDocumentTypes: knowledgeBaseReferences.includeDocumentTypes,
      excludeDocumentTypes: knowledgeBaseReferences.excludeDocumentTypes,
    })
    .from(knowledgeBaseReferences)
    .innerJoin(tenants, eq(tenants.id, knowledgeBaseReferences.targetTenantId))
    .where(
      and(
        eq(knowledgeBaseReferences.sourceTenantId, tenantId),
        eq(knowledgeBaseReferences.isActive, true),
        eq(knowledgeBaseReferences.status, "active")
      )
    ) : [];

  console.log(`📋 Found ${activeReferences.length} active references`);
  
  if (activeReferences.length > 0) {
    console.log(`🔗 Active references:`, activeReferences.map(ref => ({
      id: ref.id,
      targetTenantId: ref.targetTenantId,
      targetTenantName: ref.targetTenantName,
      weight: ref.weight,
      maxResults: ref.maxResults,
      minSimilarity: ref.minSimilarity,
      includeTags: ref.includeTags,
      excludeTags: ref.excludeTags,
      includeDocumentTypes: ref.includeDocumentTypes,
      excludeDocumentTypes: ref.excludeDocumentTypes
    })));
  }

  // Build list of tenant IDs to search (primary + referenced)
  const searchTenantIds = [tenantId, ...activeReferences.map(ref => ref.targetTenantId)];
  
  // Create tenant weight map
  const tenantWeights = new Map<string, number>();
  tenantWeights.set(tenantId, 1.0); // Primary tenant has weight 1.0
  activeReferences.forEach(ref => {
    tenantWeights.set(ref.targetTenantId, ref.weight || 1.0); // Handle null weight
  });

  // Search documents across all accessible tenants
  console.log(`🔍 Searching documents across ${searchTenantIds.length} tenants`);
  console.log(`🎯 Searching in tenants: ${searchTenantIds.join(', ')}`);
  console.log(`📏 Min similarity threshold: ${minSimilarity}`);
  
  // First, let's check how many total documents exist in these tenants
  const totalDocs = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(
      and(
        inArray(documents.tenantId, searchTenantIds),
        eq(documents.isActive, true),
        isNotNull(documents.embedding)
      )
    );
  
  console.log(`📚 Total active documents with embeddings: ${totalDocs[0]?.count || 0}`);

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
        inArray(documents.tenantId, searchTenantIds),
        eq(documents.isActive, true),
        isNotNull(documents.embedding),
        sql`1 - (${documents.embedding} <=> ${embeddingString}::vector) >= ${minSimilarity}`
      )
    )
    .orderBy(sql`${documents.embedding} <=> ${embeddingString}::vector`)
    .limit(maxResults * 3); // Get more results to account for filtering and weighting
  
  console.log(`🔍 Found ${allDocuments.length} documents above similarity threshold`);
  
  // Log similarity scores for debugging
  if (allDocuments.length > 0) {
    console.log(`📊 Top document similarities:`, allDocuments.slice(0, 3).map(doc => ({
      name: doc.name,
      similarity: doc.similarity,
      tenantId: doc.tenantId
    })));
  }

  // Get document tags for filtering
  const documentIds = allDocuments.map(doc => doc.id);
  const documentTagsMap = new Map<string, string[]>();
  
  if (documentIds.length > 0) {
    const tagsResult = await db
      .select({
        documentId: documentTags.documentId,
        tag: documentTags.tag,
      })
      .from(documentTags)
      .where(inArray(documentTags.documentId, documentIds));
    
    tagsResult.forEach(({ documentId, tag }) => {
      if (!documentTagsMap.has(documentId)) {
        documentTagsMap.set(documentId, []);
      }
      documentTagsMap.get(documentId)!.push(tag);
    });
  }

  // Search web analyses across all accessible tenants
  console.log(`🌐 Searching web analyses across ${searchTenantIds.length} tenants`);
  
  // Check total web analyses
  const totalWebAnalyses = await db
    .select({ count: sql<number>`count(*)` })
    .from(webAnalysis)
    .where(
      and(
        inArray(webAnalysis.tenantId, searchTenantIds),
        eq(webAnalysis.status, "success"),
        isNotNull(webAnalysis.embedding)
      )
    );
  
  console.log(`🌐 Total web analyses with embeddings: ${totalWebAnalyses[0]?.count || 0}`);

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
        inArray(webAnalysis.tenantId, searchTenantIds),
        eq(webAnalysis.status, "success"),
        isNotNull(webAnalysis.embedding),
        sql`1 - (${webAnalysis.embedding} <=> ${embeddingString}::vector) >= ${minSimilarity}`
      )
    )
    .orderBy(sql`${webAnalysis.embedding} <=> ${embeddingString}::vector`)
    .limit(maxResults * 2);
  
  console.log(`🌐 Found ${allWebAnalyses.length} web analyses above similarity threshold`);

  // Apply filtering and weights to documents
  console.log(`🔧 Applying filters to ${allDocuments.length} documents`);
  
  const filteredDocuments = allDocuments.filter(doc => {
    const isPrimary = doc.tenantId === tenantId;
    if (isPrimary) return true; // Always include primary tenant documents

    const reference = activeReferences.find(ref => ref.targetTenantId === doc.tenantId);
    if (!reference) {
      console.log(`❌ No reference found for tenant ${doc.tenantId}, document: ${doc.name}`);
      return false;
    }

    const docTags = documentTagsMap.get(doc.id) || [];
    
    // Apply tag filtering
    if (reference.includeTags && reference.includeTags.length > 0) {
      const hasIncludedTag = reference.includeTags.some(tag => docTags.includes(tag));
      if (!hasIncludedTag) {
        console.log(`❌ Document ${doc.name} filtered out - missing required tags. Required: ${reference.includeTags}, Has: ${docTags}`);
        return false;
      }
    }
    
    if (reference.excludeTags && reference.excludeTags.length > 0) {
      const hasExcludedTag = reference.excludeTags.some(tag => docTags.includes(tag));
      if (hasExcludedTag) {
        console.log(`❌ Document ${doc.name} filtered out - has excluded tags. Excluded: ${reference.excludeTags}, Has: ${docTags}`);
        return false;
      }
    }

    // Apply document type filtering
    if (reference.includeDocumentTypes && reference.includeDocumentTypes.length > 0) {
      const docType = doc.fileType || 'unknown';
      if (!reference.includeDocumentTypes.includes(docType)) {
        console.log(`❌ Document ${doc.name} filtered out - wrong type. Required: ${reference.includeDocumentTypes}, Has: ${docType}`);
        return false;
      }
    }
    
    if (reference.excludeDocumentTypes && reference.excludeDocumentTypes.length > 0) {
      const docType = doc.fileType || 'unknown';
      if (reference.excludeDocumentTypes.includes(docType)) {
        console.log(`❌ Document ${doc.name} filtered out - excluded type. Excluded: ${reference.excludeDocumentTypes}, Has: ${docType}`);
        return false;
      }
    }

    // Apply minimum similarity from reference settings
    const refMinSimilarity = reference.minSimilarity || minSimilarity;
    if (doc.similarity < refMinSimilarity) {
      console.log(`❌ Document ${doc.name} filtered out - low similarity. Required: ${refMinSimilarity}, Has: ${doc.similarity}`);
      return false;
    }

    console.log(`✅ Document ${doc.name} passed all filters. Similarity: ${doc.similarity}`);
    return true;
  });
  
  console.log(`🎯 After filtering: ${filteredDocuments.length} documents remaining`);

  // Apply weights and prepare results
  const weightedDocuments = filteredDocuments.map(doc => {
    const isPrimary = doc.tenantId === tenantId;
    const reference = activeReferences.find(ref => ref.targetTenantId === doc.tenantId);
    const weight = tenantWeights.get(doc.tenantId) || 1.0;
    
    return {
      ...doc,
      sourceTenantId: doc.tenantId,
      sourceTenantName: isPrimary ? "Primary KB" : (reference?.targetTenantName || "Unknown"),
      weight,
      weightedSimilarity: doc.similarity * weight,
      tags: documentTagsMap.get(doc.id) || [],
      fileType: doc.fileType || undefined, // Convert null to undefined
    };
  });

  const weightedWebAnalyses = allWebAnalyses.map(analysis => {
    const isPrimary = analysis.tenantId === tenantId;
    const reference = activeReferences.find(ref => ref.targetTenantId === analysis.tenantId);
    const weight = tenantWeights.get(analysis.tenantId) || 1.0;
    
    return {
      ...analysis,
      sourceTenantId: analysis.tenantId,
      sourceTenantName: isPrimary ? "Primary KB" : (reference?.targetTenantName || "Unknown"),
      weight,
      weightedSimilarity: analysis.similarity * weight,
      title: analysis.title || "Untitled", // Handle null title
    };
  });

  // Sort by weighted similarity and take top results
  const finalDocuments = weightedDocuments
    .sort((a, b) => b.weightedSimilarity - a.weightedSimilarity)
    .slice(0, Math.floor(maxResults * 0.7))
    .map(({ weightedSimilarity, tenantId, ...doc }) => doc);

  const finalWebAnalyses = weightedWebAnalyses
    .sort((a, b) => b.weightedSimilarity - a.weightedSimilarity)
    .slice(0, Math.floor(maxResults * 0.3))
    .map(({ weightedSimilarity, tenantId, ...analysis }) => analysis);

  // Calculate which references were actually used
  const referencesUsed = activeReferences
    .map(ref => {
      const documentsFound = finalDocuments.filter(doc => doc.sourceTenantId === ref.targetTenantId).length;
      const webAnalysesFound = finalWebAnalyses.filter(analysis => analysis.sourceTenantId === ref.targetTenantId).length;
      
      return {
        referenceId: ref.id,
        tenantName: ref.targetTenantName,
        documentsFound,
        webAnalysesFound,
      };
    })
    .filter(usage => usage.documentsFound > 0 || usage.webAnalysesFound > 0);

  const searchTime = Date.now() - searchStartTime;
  const totalQueryTime = Date.now() - startTime;

  console.log(`✅ Cross-KB search completed in ${totalQueryTime}ms (embedding: ${embeddingTime}ms, search: ${searchTime}ms)`);
  console.log(`📊 Results: ${finalDocuments.length} documents, ${finalWebAnalyses.length} web analyses from ${referencesUsed.length} references`);

  // Log usage analytics for each reference used
  if (sessionId && userId) {
    await Promise.all(
      referencesUsed.map(usage =>
        logReferenceUsage({
          referenceId: usage.referenceId,
          querySessionId: sessionId,
          documentsRetrieved: usage.documentsFound + usage.webAnalysesFound,
          usedInResponse: true,
          queryTimeMs: totalQueryTime,
          queryText: query.substring(0, 500), // Limit query text length
          userId,
        })
      )
    );
  }

  return {
    documents: finalDocuments,
    webAnalyses: finalWebAnalyses,
    referencesUsed,
    performanceMetrics: {
      totalQueryTime,
      embeddingTime,
      searchTime,
      totalResults: finalDocuments.length + finalWebAnalyses.length,
    },
  };
}

/**
 * Get detailed search analytics for a tenant
 */
export async function getCrossKBSearchAnalytics(tenantId: string, days = 30) {
  // Implementation for detailed analytics
  // This would analyze reference usage patterns, performance metrics, etc.
  return {
    // Analytics data structure
  };
} 