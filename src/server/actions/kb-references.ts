"use server";

import { db } from "@/server/db";
import { 
  knowledgeBaseReferences,
  kbConnectionTemplates,
  kbBulkOperations,
  tenants,
  referenceUsageAnalytics
} from "@/server/db/schema";
import { eq, and, inArray, or, isNull, desc, sql, gte } from "drizzle-orm";
import { requireAuth, requireGlobalRole, getGlobalUserRole } from "./auth";
import { revalidatePath } from "next/cache";
import { searchAcrossKnowledgeBases } from "./enhanced-search";

// Connection template management
export async function createConnectionTemplate(data: {
  name: string;
  description?: string;
  isSystemTemplate: boolean;
  defaultWeight: number;
  includeTags?: string[];
  excludeTags?: string[];
}) {
  const session = await requireGlobalRole("super_admin");
  
  if (data.isSystemTemplate) {
    const globalRole = await getGlobalUserRole();
    if (globalRole !== "super_admin") {
      throw new Error("Only super admins can create system templates");
    }
  }

  const [template] = await db
    .insert(kbConnectionTemplates)
    .values({
      name: data.name,
      description: data.description,
      isSystemTemplate: data.isSystemTemplate,
      defaultWeight: data.defaultWeight,
      includeTags: data.includeTags,
      excludeTags: data.excludeTags,
      createdBy: session.id,
      createdAt: new Date(),
    })
    .returning();

  return template;
}

// Get available connection templates (for super admins - full management)
export async function getConnectionTemplates() {
  const session = await requireGlobalRole("super_admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const templates = await db
      .select()
      .from(kbConnectionTemplates)
      .orderBy(desc(kbConnectionTemplates.createdAt));

    return templates.map(template => ({
      ...template,
      usageCount: 0, // TODO: Calculate actual usage from references
    }));
  } catch (error) {
    console.error("Error fetching connection templates:", error);
    throw new Error("Failed to fetch connection templates");
  }
}

// Get available connection templates for tenant admins (read-only for use)
export async function getAvailableConnectionTemplates(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    // Only return public/system templates that tenant admins can use
    const templates = await db
      .select()
      .from(kbConnectionTemplates)
      .where(eq(kbConnectionTemplates.isSystemTemplate, true))
      .orderBy(desc(kbConnectionTemplates.createdAt));

    return templates.map(template => ({
      ...template,
      usageCount: 0, // TODO: Calculate actual usage from references
    }));
  } catch (error) {
    console.error("Error fetching available connection templates:", error);
    throw new Error("Failed to fetch available connection templates");
  }
}

// Enhanced reference request
export async function requestKnowledgeBaseReference(
  sourceTenantId: string,
  targetTenantId: string,
  config: {
    name: string;
    description?: string;
    templateId?: string;
    customConfig?: {
      weight?: number;
      maxResults?: number;
      minSimilarity?: number;
      includeTags?: string[];
      excludeTags?: string[];
    };
  }
) {
  const session = await requireAuth(sourceTenantId, "admin");
  
  if (sourceTenantId === targetTenantId) {
    throw new Error("Cannot reference own knowledge base");
  }

  // Check if target tenant exists
  const targetTenant = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, targetTenantId))
    .limit(1);

  if (!targetTenant[0]) {
    throw new Error("Target knowledge base not found");
  }

  // Check if reference already exists
  const existing = await db
    .select({ id: knowledgeBaseReferences.id })
    .from(knowledgeBaseReferences)
    .where(
      and(
        eq(knowledgeBaseReferences.sourceTenantId, sourceTenantId),
        eq(knowledgeBaseReferences.targetTenantId, targetTenantId),
        inArray(knowledgeBaseReferences.status, ["pending", "active"])
      )
    )
    .limit(1);

  if (existing[0]) {
    throw new Error("A reference request already exists for this knowledge base");
  }

  const referenceData = {
    sourceTenantId,
    targetTenantId,
    name: config.name,
    description: config.description,
    weight: config.customConfig?.weight || 1.0,
    maxResults: config.customConfig?.maxResults || 5,
    minSimilarity: config.customConfig?.minSimilarity || 0.1,
    includeTags: config.customConfig?.includeTags || [],
    excludeTags: config.customConfig?.excludeTags || [],
    status: "pending",
    isActive: false,
    createdBy: session.id,
  };

  const [reference] = await db
    .insert(knowledgeBaseReferences)
    .values(referenceData)
    .returning();

  revalidatePath(`/t/${sourceTenantId}/kb/references`);
  return reference;
}

// Get knowledge base references
export async function getKnowledgeBaseReferences(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  
  try {
    const references = await db
      .select({
        id: knowledgeBaseReferences.id,
        name: knowledgeBaseReferences.name,
        description: knowledgeBaseReferences.description,
        status: knowledgeBaseReferences.status,
        isActive: knowledgeBaseReferences.isActive,
        weight: knowledgeBaseReferences.weight,
        maxResults: knowledgeBaseReferences.maxResults,
        createdAt: knowledgeBaseReferences.createdAt,
        targetTenant: {
          id: tenants.id,
          name: tenants.name,
        }
      })
      .from(knowledgeBaseReferences)
      .leftJoin(tenants, eq(knowledgeBaseReferences.targetTenantId, tenants.id))
      .where(eq(knowledgeBaseReferences.sourceTenantId, tenantId))
      .orderBy(desc(knowledgeBaseReferences.createdAt));

    return references;
  } catch (error) {
    console.error("Error fetching knowledge base references:", error);
    throw new Error("Failed to fetch references");
  }
}

// Get pending reference requests
export async function getPendingReferenceRequests(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  
  try {
    const requests = await db
      .select({
        id: knowledgeBaseReferences.id,
        name: knowledgeBaseReferences.name,
        description: knowledgeBaseReferences.description,
        status: knowledgeBaseReferences.status,
        weight: knowledgeBaseReferences.weight,
        maxResults: knowledgeBaseReferences.maxResults,
        sourceTenantId: knowledgeBaseReferences.sourceTenantId,
        targetTenantId: knowledgeBaseReferences.targetTenantId,
        customConfig: {
          weight: knowledgeBaseReferences.weight,
          maxResults: knowledgeBaseReferences.maxResults,
          minSimilarity: knowledgeBaseReferences.minSimilarity,
          includeTags: knowledgeBaseReferences.includeTags,
          excludeTags: knowledgeBaseReferences.excludeTags,
        },
        createdAt: knowledgeBaseReferences.createdAt,
        sourceTenant: {
          id: sql`source_tenant.id`,
          name: sql`source_tenant.name`,
        },
        targetTenant: {
          id: sql`target_tenant.id`, 
          name: sql`target_tenant.name`,
        }
      })
      .from(knowledgeBaseReferences)
      .leftJoin(sql`${tenants} as source_tenant`, eq(knowledgeBaseReferences.sourceTenantId, sql`source_tenant.id`))
      .leftJoin(sql`${tenants} as target_tenant`, eq(knowledgeBaseReferences.targetTenantId, sql`target_tenant.id`))
      .where(eq(knowledgeBaseReferences.status, "pending"));

    return requests;
  } catch (error) {
    console.error("Error fetching pending reference requests:", error);
    throw new Error("Failed to fetch requests");
  }
}

// Get available tenants for referencing
export async function getAvailableTenants(currentTenantId: string) {
  const session = await requireAuth(currentTenantId, "admin");
  
  try {
    const availableTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        description: tenants.description,
      })
      .from(tenants)
      .where(sql`${tenants.id} != ${currentTenantId}`);

    return availableTenants;
  } catch (error) {
    console.error("Error fetching available tenants:", error);
    throw new Error("Failed to fetch available tenants");
  }
}

// Get a specific knowledge base reference
export async function getKnowledgeBaseReference(tenantId: string, referenceId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const [reference] = await db
      .select({
        id: knowledgeBaseReferences.id,
        name: knowledgeBaseReferences.name,
        description: knowledgeBaseReferences.description,
        status: knowledgeBaseReferences.status,
        isActive: knowledgeBaseReferences.isActive,
        weight: knowledgeBaseReferences.weight,
        maxResults: knowledgeBaseReferences.maxResults,
        minSimilarity: knowledgeBaseReferences.minSimilarity,
        includeTags: knowledgeBaseReferences.includeTags,
        excludeTags: knowledgeBaseReferences.excludeTags,
        createdAt: knowledgeBaseReferences.createdAt,
        targetTenant: {
          id: tenants.id,
          name: tenants.name,
        }
      })
      .from(knowledgeBaseReferences)
      .leftJoin(tenants, eq(knowledgeBaseReferences.targetTenantId, tenants.id))
      .where(
        and(
          eq(knowledgeBaseReferences.id, referenceId),
          eq(knowledgeBaseReferences.sourceTenantId, tenantId)
        )
      )
      .limit(1);

    if (!reference) {
      throw new Error("Reference not found");
    }

    return reference;
  } catch (error) {
    console.error("Error fetching knowledge base reference:", error);
    throw new Error("Failed to fetch reference");
  }
}

// Update a knowledge base reference
export async function updateKnowledgeBaseReference(
  tenantId: string, 
  referenceId: string, 
  data: {
    isActive?: boolean;
    weight?: number;
    maxResults?: number;
    minSimilarity?: number;
    includeTags?: string[];
    excludeTags?: string[];
  }
) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const [updated] = await db
      .update(knowledgeBaseReferences)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeBaseReferences.id, referenceId),
          eq(knowledgeBaseReferences.sourceTenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Reference not found");
    }

    revalidatePath(`/t/${tenantId}/kb/references`);
    return updated;
  } catch (error) {
    console.error("Error updating knowledge base reference:", error);
    throw new Error("Failed to update reference");
  }
}

// Test a knowledge base reference
export async function testKnowledgeBaseReference(
  tenantId: string, 
  referenceId: string, 
  testQuery: string
) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    // Get the reference configuration
    const [reference] = await db
      .select()
      .from(knowledgeBaseReferences)
      .where(
        and(
          eq(knowledgeBaseReferences.id, referenceId),
          eq(knowledgeBaseReferences.sourceTenantId, tenantId)
        )
      )
      .limit(1);

    if (!reference) {
      throw new Error("Reference not found");
    }

    // Perform test search using the reference configuration
    const searchResults = await searchAcrossKnowledgeBases(reference.targetTenantId, testQuery, {
      maxResults: reference.maxResults || 5,
      minSimilarity: reference.minSimilarity || 0.1,
      includeReferences: false, // Don't include other references in test
    });

    // Transform results for testing display
    const results = [
      ...searchResults.documents.map(doc => ({
        title: doc.name,
        content: doc.content,
        similarity: doc.similarity,
        source: `Document: ${doc.name}`,
      })),
      ...searchResults.webAnalyses.map(web => ({
        title: web.title,
        content: web.content,
        similarity: web.similarity,
        source: `Web: ${web.url}`,
      }))
    ].slice(0, reference.maxResults || 5);

    return results;
  } catch (error) {
    console.error("Error testing knowledge base reference:", error);
    throw new Error("Failed to test reference");
  }
}

// Approve a reference request
export async function approveReferenceRequest(requestId: string, tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const [updated] = await db
      .update(knowledgeBaseReferences)
      .set({
        status: "active",
        isActive: true,
        approvedBy: session.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeBaseReferences.id, requestId),
          eq(knowledgeBaseReferences.targetTenantId, tenantId),
          eq(knowledgeBaseReferences.status, "pending")
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Request not found or already processed");
    }

    revalidatePath(`/t/${tenantId}/kb/references/requests`);
    return updated;
  } catch (error) {
    console.error("Error approving reference request:", error);
    throw new Error("Failed to approve request");
  }
}

// Reject a reference request
export async function rejectReferenceRequest(requestId: string, tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const [updated] = await db
      .update(knowledgeBaseReferences)
      .set({
        status: "rejected",
        isActive: false,
        rejectedBy: session.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeBaseReferences.id, requestId),
          eq(knowledgeBaseReferences.targetTenantId, tenantId),
          eq(knowledgeBaseReferences.status, "pending")
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Request not found or already processed");
    }

    revalidatePath(`/t/${tenantId}/kb/references/requests`);
    return updated;
  } catch (error) {
    console.error("Error rejecting reference request:", error);
    throw new Error("Failed to reject request");
  }
}

// Get reference analytics (simplified mock data)
export async function getReferenceAnalytics(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    return {
      totalQueries: 1247,
      queriesGrowth: 12.5,
      avgResponseTime: 342,
      responseTimeImprovement: 28,
      successRate: 94.3,
      successRateChange: 2.1,
      activeReferences: 3,
      totalReferences: 5,
      errorBreakdown: [
        {
          type: "Connection Timeout",
          description: "Target knowledge base took too long to respond",
          count: 12
        }
      ],
      alerts: []
    };
  } catch (error) {
    console.error("Error fetching reference analytics:", error);
    throw new Error("Failed to fetch analytics");
  }
}

// Get top performing references (simplified mock data)
export async function getTopPerformingReferences(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    return [
      {
        id: "1",
        name: "Project Management KB",
        targetTenant: { name: "Project Team" },
        queryCount: 523,
        avgResponseTime: 298,
        successRate: 96.5,
        score: 92,
        usagePercentage: 45
      },
      {
        id: "2",
        name: "Technical Documentation",
        targetTenant: { name: "Engineering" },
        queryCount: 341,
        avgResponseTime: 412,
        successRate: 91.2,
        score: 87,
        usagePercentage: 30
      }
    ];
  } catch (error) {
    console.error("Error fetching top performing references:", error);
    throw new Error("Failed to fetch top references");
  }
}

// Get usage trends (simplified mock data)
export async function getUsageTrends(tenantId: string) {
  const session = await requireAuth(tenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    return [
      { period: "Last 7 days", queries: 234, percentage: 85 },
      { period: "Last 30 days", queries: 1047, percentage: 100 },
      { period: "Last 90 days", queries: 2891, percentage: 65 }
    ];
  } catch (error) {
    console.error("Error fetching usage trends:", error);
    throw new Error("Failed to fetch usage trends");
  }
}

// Log reference usage for analytics
export async function logReferenceUsage(data: {
  referenceId: string;
  querySessionId: string;
  documentsRetrieved: number;
  usedInResponse: boolean;
  queryTimeMs: number;
  queryText: string;
  userId: string;
}) {
  try {
    // Insert usage analytics record
    await db
      .insert(referenceUsageAnalytics)
      .values({
        referenceId: data.referenceId,
        querySessionId: data.querySessionId,
        documentsRetrieved: data.documentsRetrieved,
        usedInResponse: data.usedInResponse,
        queryTimeMs: data.queryTimeMs,
        queryText: data.queryText,
        userId: data.userId,
        createdAt: new Date(),
      });
  } catch (error) {
    console.error("Error logging reference usage:", error);
    // Don't throw error here to avoid breaking the search functionality
  }
} 