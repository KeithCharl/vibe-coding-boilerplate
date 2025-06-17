"use server";

import { db } from "@/server/db";
import { knowledgeBaseReferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Fix the existing reference to be completely open
export async function fixExistingReference() {
  try {
    const result = await db
      .update(knowledgeBaseReferences)
      .set({
        minSimilarity: 0.0, // No filtering - include everything!
        maxResults: 100,    // High limit
        weight: 1.0,
        status: "active",
        isActive: true,
        includeTags: [],
        excludeTags: [],
        includeDocumentTypes: null,
        excludeDocumentTypes: null,
        autoApprove: true,
        requiresReview: false,
      })
      .where(eq(knowledgeBaseReferences.id, "77ce9998-1363-4ecb-829b-665c832be827"))
      .returning();

    console.log("✅ Fixed existing reference:", result[0]);
    return result[0];
  } catch (error) {
    console.error("❌ Error fixing reference:", error);
    throw error;
  }
} 