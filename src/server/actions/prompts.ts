"use server";

import { db } from "@/server/db";
import { prompts, userTenantRoles } from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";
import { eq, and, or, desc, asc, ilike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Prompt = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  isPublic: boolean | null;
  isActive: boolean | null;
  usageCount: number | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CreatePromptData = {
  name: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
};

export type UpdatePromptData = {
  name?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
};

// Helper function to check user permissions
async function getUserRole(tenantId: string): Promise<"viewer" | "contributor" | "admin" | null> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;

  const userRole = await db
    .select({ role: userTenantRoles.role })
    .from(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, session.user.id),
        eq(userTenantRoles.tenantId, tenantId)
      )
    )
    .limit(1);

  return userRole[0]?.role ?? null;
}

// Check if user can manage prompts (contributor or admin)
async function canManagePrompts(tenantId: string): Promise<boolean> {
  const role = await getUserRole(tenantId);
  return role === "contributor" || role === "admin";
}

// Check if user can manage specific prompt (owner, admin, or public prompt with contributor+)
async function canManageSpecificPrompt(tenantId: string, promptId: string): Promise<boolean> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return false;

  const role = await getUserRole(tenantId);
  if (role === "admin") return true;

  const prompt = await db
    .select({ createdBy: prompts.createdBy, isPublic: prompts.isPublic })
    .from(prompts)
    .where(and(eq(prompts.id, promptId), eq(prompts.tenantId, tenantId)))
    .limit(1);

  if (!prompt[0]) return false;

  // Owner can always manage their prompts
  if (prompt[0].createdBy === session.user.id) return true;

  // Contributors can manage public prompts
  if (role === "contributor" && prompt[0].isPublic) return true;

  return false;
}

export async function createPrompt(tenantId: string, data: CreatePromptData) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!(await canManagePrompts(tenantId))) {
    throw new Error("Insufficient permissions to create prompts");
  }

  try {
    const [newPrompt] = await db
      .insert(prompts)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        content: data.content,
        category: data.category || "general",
        tags: data.tags || [],
        isPublic: data.isPublic || false,
        createdBy: session.user.id,
      })
      .returning();

    revalidatePath(`/t/${tenantId}/prompts`);
    return newPrompt;
  } catch (error) {
    console.error("Error creating prompt:", error);
    throw new Error("Failed to create prompt");
  }
}

export async function updatePrompt(tenantId: string, promptId: string, data: UpdatePromptData) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!(await canManageSpecificPrompt(tenantId, promptId))) {
    throw new Error("Insufficient permissions to update this prompt");
  }

  try {
    const [updatedPrompt] = await db
      .update(prompts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(prompts.id, promptId), eq(prompts.tenantId, tenantId)))
      .returning();

    revalidatePath(`/t/${tenantId}/prompts`);
    return updatedPrompt;
  } catch (error) {
    console.error("Error updating prompt:", error);
    throw new Error("Failed to update prompt");
  }
}

export async function deletePrompt(tenantId: string, promptId: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!(await canManageSpecificPrompt(tenantId, promptId))) {
    throw new Error("Insufficient permissions to delete this prompt");
  }

  try {
    await db
      .delete(prompts)
      .where(and(eq(prompts.id, promptId), eq(prompts.tenantId, tenantId)));

    revalidatePath(`/t/${tenantId}/prompts`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting prompt:", error);
    throw new Error("Failed to delete prompt");
  }
}

export async function getPrompts(tenantId: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userRole = await getUserRole(tenantId);
  if (!userRole) {
    throw new Error("Access denied to tenant");
  }

  try {
    let result;
    
    if (userRole === "admin") {
      // Admins can see all prompts
      result = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true)
          )
        )
        .orderBy(desc(prompts.createdAt));
    } else {
      // Other users can only see public prompts + their own
      result = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true),
            or(
              eq(prompts.isPublic, true),
              eq(prompts.createdBy, session.user.id)
            )
          )
        )
        .orderBy(desc(prompts.createdAt));
    }

    return result;
  } catch (error) {
    console.error("Error fetching prompts:", error);
    throw new Error("Failed to fetch prompts");
  }
}

export async function getPrompt(tenantId: string, promptId: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userRole = await getUserRole(tenantId);
  if (!userRole) {
    throw new Error("Access denied to tenant");
  }

  try {
    let result;
    
    if (userRole === "admin") {
      // Admins can see any prompt
      result = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.id, promptId),
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true)
          )
        )
        .limit(1);
    } else {
      // Other users can only see public prompts + their own
      result = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.id, promptId),
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true),
            or(
              eq(prompts.isPublic, true),
              eq(prompts.createdBy, session.user.id)
            )
          )
        )
        .limit(1);
    }

    return result[0];
  } catch (error) {
    console.error("Error fetching prompt:", error);
    throw new Error("Failed to fetch prompt");
  }
}

export async function incrementPromptUsage(tenantId: string, promptId: string) {
  try {
    await db
      .update(prompts)
      .set({
        usageCount: sql`${prompts.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(prompts.id, promptId), eq(prompts.tenantId, tenantId)));
  } catch (error) {
    console.error("Error incrementing prompt usage:", error);
    // Don't throw error for usage tracking failures
  }
}

export async function getPromptCategories(tenantId: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userRole = await getUserRole(tenantId);
  if (!userRole) {
    throw new Error("Access denied to tenant");
  }

  try {
    let result;
    
    if (userRole === "admin") {
      result = await db
        .selectDistinct({ category: prompts.category })
        .from(prompts)
        .where(
          and(
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true)
          )
        );
    } else {
      result = await db
        .selectDistinct({ category: prompts.category })
        .from(prompts)
        .where(
          and(
            eq(prompts.tenantId, tenantId),
            eq(prompts.isActive, true),
            or(
              eq(prompts.isPublic, true),
              eq(prompts.createdBy, session.user.id)
            )
          )
        );
    }

    return result.map(c => c.category).filter(Boolean);
  } catch (error) {
    console.error("Error fetching prompt categories:", error);
    throw new Error("Failed to fetch prompt categories");
  }
}

export async function getUserPermissions(tenantId: string) {
  const role = await getUserRole(tenantId);
  
  return {
    canView: role !== null,
    canCreate: role === "contributor" || role === "admin",
    canEditAll: role === "admin",
    canDeleteAll: role === "admin",
    role,
  };
}

/**
 * Generate a prompt using AI based on user description
 */
export async function generatePromptWithAI(
  tenantId: string,
  description: string,
  requirements?: {
    purpose?: string;
    format?: string;
    tone?: string;
    constraints?: string;
    category?: string;
  }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!(await canManagePrompts(tenantId))) {
    throw new Error("Insufficient permissions to generate prompts");
  }

  if (!description?.trim()) {
    throw new Error("Description is required for AI generation");
  }

  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    const systemPrompt = `You are an expert prompt engineer with deep knowledge of AI systems and prompt design best practices. Your task is to create effective, well-structured prompts based on user descriptions.

When creating a prompt, you should:
1. Generate a clear, descriptive name that reflects the prompt's purpose
2. Write a helpful description explaining when and how to use the prompt
3. Create a comprehensive prompt that includes:
   - Clear instructions and objectives
   - Proper context setting
   - Specific format requirements if needed
   - Examples when helpful
   - Clear constraints and guidelines

The prompt should be optimized for AI systems and follow best practices for clarity, specificity, and effectiveness.

Respond in JSON format with exactly these fields:
{
  "name": "Prompt Name",
  "description": "Clear description of the prompt's purpose and use case",
  "content": "The actual prompt content, well-structured and optimized",
  "category": "Appropriate category for the prompt",
  "tags": ["relevant", "tags", "for", "filtering"]
}`;

    const userPrompt = `Create a prompt based on this description: "${description}"

${requirements?.purpose ? `Purpose: ${requirements.purpose}` : ''}
${requirements?.format ? `Output format: ${requirements.format}` : ''}
${requirements?.tone ? `Tone: ${requirements.tone}` : ''}
${requirements?.constraints ? `Constraints: ${requirements.constraints}` : ''}
${requirements?.category ? `Preferred category: ${requirements.category}` : ''}

Generate a JSON response with name, description, content, category, and tags fields.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    let result;
    try {
      // Extract JSON from the response
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    // Validate the response structure
    if (!result.name || !result.description || !result.content) {
      throw new Error("AI response missing required fields");
    }

    return {
      success: true,
      prompt: {
        name: result.name,
        description: result.description,
        content: result.content,
        category: result.category || "general",
        tags: Array.isArray(result.tags) ? result.tags : [],
      }
    };
  } catch (error) {
    console.error("AI prompt generation error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate prompt with AI");
  }
}

/**
 * Refine an existing prompt using AI
 */
export async function refinePromptWithAI(
  tenantId: string,
  currentPrompt: {
    name: string;
    description?: string;
    content: string;
    category?: string;
    tags?: string[];
  },
  refinementRequest: string
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!(await canManagePrompts(tenantId))) {
    throw new Error("Insufficient permissions to refine prompts");
  }

  if (!refinementRequest?.trim()) {
    throw new Error("Refinement request is required");
  }

  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    const systemPrompt = `You are an expert prompt engineer. Your task is to refine and improve existing prompts based on user feedback while maintaining their core purpose and effectiveness.

When refining a prompt, you should:
1. Carefully analyze the current prompt
2. Understand the user's refinement request
3. Make targeted improvements while preserving the core functionality
4. Ensure the refined prompt is more effective and aligned with the user's needs
5. Maintain clarity and specificity

Respond in JSON format with exactly these fields:
{
  "name": "Refined prompt name (may be the same)",
  "description": "Updated description",
  "content": "Improved prompt content",
  "category": "Updated category if needed",
  "tags": ["updated", "tags"],
  "changes": "Brief explanation of what was changed and why"
}`;

    const userPrompt = `Refine this existing prompt based on the user's request:

CURRENT PROMPT:
Name: ${currentPrompt.name}
Description: ${currentPrompt.description || 'No description'}
Content: ${currentPrompt.content}
Category: ${currentPrompt.category || 'general'}
Tags: ${currentPrompt.tags?.join(', ') || 'None'}

REFINEMENT REQUEST:
${refinementRequest}

Please refine the prompt to better meet the user's needs while maintaining its core purpose and effectiveness.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    let result;
    try {
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    if (!result.name || !result.description || !result.content) {
      throw new Error("AI response missing required fields");
    }

    return {
      success: true,
      prompt: {
        name: result.name,
        description: result.description,
        content: result.content,
        category: result.category || currentPrompt.category || "general",
        tags: Array.isArray(result.tags) ? result.tags : (currentPrompt.tags || []),
      },
      changes: result.changes || "Prompt refined based on your request"
    };
  } catch (error) {
    console.error("AI prompt refinement error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to refine prompt with AI");
  }
} 