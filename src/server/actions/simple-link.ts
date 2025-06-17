"use server";

import { db } from "@/server/db";
import { knowledgeBaseReferences, tenants } from "@/server/db/schema";
import { requireAuth } from "./auth";
import { eq, and } from "drizzle-orm";

// Super simple function to link knowledge bases together (no config needed)
export async function linkKnowledgeBasesSimple(
  fromTenantId: string,
  toTenantId: string
) {
  const session = await requireAuth(fromTenantId, "admin");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    // Get the target tenant name
    const targetTenant = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, toTenantId))
      .limit(1);

    if (!targetTenant[0]) {
      throw new Error("Target knowledge base not found");
    }

    // Check if link already exists
    const existing = await db
      .select()
      .from(knowledgeBaseReferences)
      .where(
        and(
          eq(knowledgeBaseReferences.sourceTenantId, fromTenantId),
          eq(knowledgeBaseReferences.targetTenantId, toTenantId)
        )
      )
      .limit(1);

    if (existing[0]) {
      // Just update to active if exists
      await db
        .update(knowledgeBaseReferences)
        .set({
          status: "active",
          isActive: true,
          approvedAt: new Date(),
          approvedBy: session.id,
        })
        .where(eq(knowledgeBaseReferences.id, existing[0].id));

      return { success: true, message: "Knowledge bases linked successfully" };
    }

    // Create simple, wide-open link
    await db
      .insert(knowledgeBaseReferences)
      .values({
        sourceTenantId: fromTenantId,
        targetTenantId: toTenantId,
        name: `Link to ${targetTenant[0].name}`,
        description: `Simple link to access all content from ${targetTenant[0].name}`,
        createdBy: session.id,
        approvedBy: session.id,
        status: "active",
        isActive: true,
        weight: 1.0,
        maxResults: 100,  // High limit
        minSimilarity: 0.0,  // No filtering
        includeTags: [],
        excludeTags: [],
        includeDocumentTypes: null,
        excludeDocumentTypes: null,
        autoApprove: true,
        requiresReview: false,
        approvedAt: new Date(),
      });

    console.log(`✅ Successfully linked ${fromTenantId} → ${toTenantId} (simple mode)`);
    return { success: true, message: "Knowledge bases linked successfully" };

  } catch (error) {
    console.error("Error linking knowledge bases:", error);
    throw new Error("Failed to link knowledge bases");
  }
}

// Simple function to list all linked KBs
export async function getLinkedKnowledgeBases(tenantId: string) {
  const session = await requireAuth(tenantId, "viewer");
  if (!session?.id) {
    throw new Error("Authentication required");
  }

  try {
    const links = await db
      .select({
        id: knowledgeBaseReferences.id,
        targetTenantId: knowledgeBaseReferences.targetTenantId,
        name: knowledgeBaseReferences.name,
        status: knowledgeBaseReferences.status,
        createdAt: knowledgeBaseReferences.createdAt,
      })
      .from(knowledgeBaseReferences)
      .where(
        and(
          eq(knowledgeBaseReferences.sourceTenantId, tenantId),
          eq(knowledgeBaseReferences.status, "active")
        )
      );

    return links;
  } catch (error) {
    console.error("Error getting linked KBs:", error);
    return [];
  }
} 