"use server";

import { db } from "@/server/db";
import { personas, chatSessionPersonas, chatSessions } from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export interface PersonaData {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  isActive: boolean | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Create a new persona
 */
export async function createPersona(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    systemPrompt: string;
  }
) {
  const user = await requireAuth(tenantId, "contributor");

  if (!data.name?.trim()) {
    throw new Error("Persona name is required");
  }

  if (!data.systemPrompt?.trim()) {
    throw new Error("System prompt is required");
  }

  const [persona] = await db
    .insert(personas)
    .values({
      tenantId,
      name: data.name.trim(),
      description: data.description?.trim(),
      systemPrompt: data.systemPrompt.trim(),
      createdBy: user.id,
    })
    .returning();

  revalidatePath(`/t/${tenantId}/personas`);
  return { success: true, persona };
}

/**
 * Get all personas for a tenant
 */
export async function getPersonas(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const tenantPersonas = await db
    .select({
      id: personas.id,
      name: personas.name,
      description: personas.description,
      systemPrompt: personas.systemPrompt,
      isActive: personas.isActive,
      createdBy: personas.createdBy,
      createdAt: personas.createdAt,
      updatedAt: personas.updatedAt,
    })
    .from(personas)
    .where(and(eq(personas.tenantId, tenantId), eq(personas.isActive, true)))
    .orderBy(desc(personas.createdAt));

  return tenantPersonas;
}

/**
 * Get a specific persona by ID
 */
export async function getPersona(tenantId: string, personaId: string) {
  await requireAuth(tenantId, "viewer");

  const [persona] = await db
    .select()
    .from(personas)
    .where(
      and(
        eq(personas.id, personaId),
        eq(personas.tenantId, tenantId),
        eq(personas.isActive, true)
      )
    )
    .limit(1);

  return persona;
}

/**
 * Update a persona
 */
export async function updatePersona(
  tenantId: string,
  personaId: string,
  data: {
    name?: string;
    description?: string;
    systemPrompt?: string;
  }
) {
  await requireAuth(tenantId, "contributor");

  if (data.name !== undefined && !data.name.trim()) {
    throw new Error("Persona name is required");
  }

  if (data.systemPrompt !== undefined && !data.systemPrompt.trim()) {
    throw new Error("System prompt is required");
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim();
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt.trim();

  await db
    .update(personas)
    .set(updateData)
    .where(
      and(
        eq(personas.id, personaId),
        eq(personas.tenantId, tenantId)
      )
    );

  revalidatePath(`/t/${tenantId}/personas`);
  return { success: true };
}

/**
 * Delete a persona (soft delete)
 */
export async function deletePersona(tenantId: string, personaId: string) {
  await requireAuth(tenantId, "contributor");

  // Remove persona from any active chat sessions first
  await db
    .delete(chatSessionPersonas)
    .where(eq(chatSessionPersonas.personaId, personaId));

  // Soft delete the persona
  await db
    .update(personas)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(personas.id, personaId),
        eq(personas.tenantId, tenantId)
      )
    );

  revalidatePath(`/t/${tenantId}/personas`);
  return { success: true };
}

/**
 * Apply personas to a chat session
 */
export async function applyChatSessionPersonas(
  tenantId: string,
  sessionId: string,
  personaIds: string[]
) {
  await requireAuth(tenantId, "viewer");

  // Verify the session belongs to the user and tenant
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!session) {
    throw new Error("Chat session not found");
  }

  // Remove existing persona associations for this session
  await db
    .delete(chatSessionPersonas)
    .where(eq(chatSessionPersonas.sessionId, sessionId));

  // Add new persona associations
  if (personaIds.length > 0) {
    // Verify all personas exist and belong to the tenant
    const existingPersonas = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.tenantId, tenantId),
          eq(personas.isActive, true),
          inArray(personas.id, personaIds)
        )
      );

    const validPersonaIds = existingPersonas.map(p => p.id);
    
    if (validPersonaIds.length !== personaIds.length) {
      throw new Error("Some personas are invalid or don't exist");
    }

    const insertData = validPersonaIds.map(personaId => ({
      sessionId,
      personaId,
    }));

    await db.insert(chatSessionPersonas).values(insertData);
  }

  return { success: true };
}

/**
 * Get personas applied to a chat session
 */
export async function getChatSessionPersonas(tenantId: string, sessionId: string) {
  await requireAuth(tenantId, "viewer");

  const sessionPersonas = await db
    .select({
      id: personas.id,
      name: personas.name,
      description: personas.description,
      systemPrompt: personas.systemPrompt,
    })
    .from(chatSessionPersonas)
    .innerJoin(personas, eq(chatSessionPersonas.personaId, personas.id))
    .where(
      and(
        eq(chatSessionPersonas.sessionId, sessionId),
        eq(personas.tenantId, tenantId),
        eq(personas.isActive, true)
      )
    );

  return sessionPersonas;
}

/**
 * Get combined system prompt for a chat session based on applied personas
 */
export async function getCombinedSystemPrompt(tenantId: string, sessionId: string): Promise<string> {
  const sessionPersonas = await getChatSessionPersonas(tenantId, sessionId);
  
  if (sessionPersonas.length === 0) {
    // Fallback to tenant's default system prompt
    return "You are a helpful AI assistant with access to the knowledge base.";
  }

  // Combine all persona prompts
  const combinedPrompt = sessionPersonas
    .map(persona => `${persona.name}: ${persona.systemPrompt}`)
    .join('\n\n');

  return `You are an AI assistant embodying the following personas:\n\n${combinedPrompt}\n\nCombine the characteristics and knowledge of all these personas when responding. You also have access to the knowledge base to provide accurate information.`;
}

/**
 * Generate a persona using AI based on user description
 */
export async function generatePersonaWithAI(
  tenantId: string,
  description: string,
  requirements?: {
    expertise?: string;
    tone?: string;
    style?: string;
    constraints?: string;
  }
) {
  await requireAuth(tenantId, "contributor");

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

    const systemPrompt = `You are an expert AI prompt engineer and persona designer. Your task is to create detailed, effective personas based on user descriptions.

When creating a persona, you should:
1. Generate a clear, descriptive name that reflects the persona's role/expertise
2. Write a concise description (1-2 sentences) explaining the persona's purpose
3. Create a comprehensive system prompt that defines the persona's:
   - Expertise and knowledge areas
   - Communication style and tone
   - Behavioral guidelines
   - Response format preferences
   - Any specific constraints or requirements

The system prompt should be detailed enough to ensure consistent, high-quality responses that match the intended persona.

Respond in JSON format with exactly these fields:
{
  "name": "Persona Name",
  "description": "Brief description of the persona's purpose and role",
  "systemPrompt": "Detailed system prompt that defines the persona's behavior, expertise, and response style"
}`;

    const userPrompt = `Create a persona based on this description: "${description}"

${requirements?.expertise ? `Expertise focus: ${requirements.expertise}` : ''}
${requirements?.tone ? `Preferred tone: ${requirements.tone}` : ''}
${requirements?.style ? `Communication style: ${requirements.style}` : ''}
${requirements?.constraints ? `Additional constraints: ${requirements.constraints}` : ''}

Generate a JSON response with name, description, and systemPrompt fields.`;

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
    if (!result.name || !result.description || !result.systemPrompt) {
      throw new Error("AI response missing required fields");
    }

    return {
      success: true,
      persona: {
        name: result.name,
        description: result.description,
        systemPrompt: result.systemPrompt,
      }
    };
  } catch (error) {
    console.error("AI persona generation error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate persona with AI");
  }
}

/**
 * Refine an existing persona using AI
 */
export async function refinePersonaWithAI(
  tenantId: string,
  currentPersona: {
    name: string;
    description?: string;
    systemPrompt: string;
  },
  refinementRequest: string
) {
  await requireAuth(tenantId, "contributor");

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

    const systemPrompt = `You are an expert AI prompt engineer. Your task is to refine and improve existing personas based on user feedback.

When refining a persona, you should:
1. Carefully analyze the current persona definition
2. Understand the user's refinement request
3. Make targeted improvements while preserving the core identity
4. Ensure the refined persona is more effective and aligned with the user's needs

Respond in JSON format with exactly these fields:
{
  "name": "Refined persona name (may be the same)",
  "description": "Updated description",
  "systemPrompt": "Improved system prompt",
  "changes": "Brief explanation of what was changed and why"
}`;

    const userPrompt = `Refine this existing persona based on the user's request:

CURRENT PERSONA:
Name: ${currentPersona.name}
Description: ${currentPersona.description || 'No description'}
System Prompt: ${currentPersona.systemPrompt}

REFINEMENT REQUEST:
${refinementRequest}

Please refine the persona to better meet the user's needs while maintaining its core identity.`;

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

    if (!result.name || !result.description || !result.systemPrompt) {
      throw new Error("AI response missing required fields");
    }

    return {
      success: true,
      persona: {
        name: result.name,
        description: result.description,
        systemPrompt: result.systemPrompt,
      },
      changes: result.changes || "Persona refined based on your request"
    };
  } catch (error) {
    console.error("AI persona refinement error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to refine persona with AI");
  }
} 