"use server";

import { db } from "@/server/db";
import { webAnalysis, analytics } from "@/server/db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { requireAuth } from "./auth";
import { scrapeWebsite, validateUrl, ScrapedContent } from "@/lib/web-scraper";
import { chunkAndEmbedDocument } from "@/lib/embeddings";
import { revalidatePath } from "next/cache";

export interface WebAnalysisData {
  id: string;
  url: string;
  title: string | null;
  content: string;
  summary: string | null;
  metadata: any;
  status: string;
  errorMessage: string | null;
  analyzedBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Analyze a single URL
 */
export async function analyzeUrl(
  tenantId: string,
  url: string,
  options: {
    waitForDynamic?: boolean;
    generateSummary?: boolean;
  } = {}
) {
  console.log(`🕸️ Starting analysis for URL: ${url}`);
  const user = await requireAuth(tenantId, "contributor");

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid URL");
  }

  // Check if URL has been analyzed recently (within last 24 hours)
  const existingAnalysis = await db
    .select()
    .from(webAnalysis)
    .where(
      and(
        eq(webAnalysis.tenantId, tenantId),
        eq(webAnalysis.url, url),
        eq(webAnalysis.status, "success")
      )
    )
    .orderBy(desc(webAnalysis.createdAt))
    .limit(1);

  if (existingAnalysis.length > 0) {
    const existing = existingAnalysis[0];
    const hoursSinceAnalysis = existing.createdAt ? 
      (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60) : 
      25; // If no date, consider it old

    if (hoursSinceAnalysis < 24) {
      console.log(`📋 Using existing analysis for ${url} (${hoursSinceAnalysis.toFixed(1)}h old)`);
      return { success: true, analysis: existing, isNew: false };
    }
  }

  try {
    // Create pending analysis record
    const [pendingAnalysis] = await db
      .insert(webAnalysis)
      .values({
        tenantId,
        url,
        title: null,
        content: "",
        status: "processing",
        analyzedBy: user.id,
      })
      .returning();

    console.log(`🔄 Created pending analysis record: ${pendingAnalysis.id}`);

    // Scrape the website
    console.log(`🕷️ Scraping website: ${url}`);
    const scrapedContent: ScrapedContent = await scrapeWebsite(url, {
      waitForDynamic: options.waitForDynamic,
      timeout: 30000,
      maxContentLength: 20000, // Limit content size
    });

    console.log(`✅ Scraped ${scrapedContent.content.length} characters from ${url}`);

    // Generate embedding for the content
    console.log(`🧠 Generating embedding for ${url}`);
    const chunks = await chunkAndEmbedDocument(scrapedContent.content, {
      fileName: scrapedContent.title,
      fileType: "web-page",
      tenantId,
    });

    const embedding = chunks.length > 0 ? chunks[0].embedding : null;
    console.log(`✅ Generated embedding with ${chunks.length} chunks`);

    // Generate summary if requested
    let summary = null;
    if (options.generateSummary && scrapedContent.content.length > 200) {
      summary = await generateContentSummary(scrapedContent.content, scrapedContent.title);
      console.log(`📝 Generated summary: ${summary?.slice(0, 100)}...`);
    }

    // Update the analysis record with results
    const [completedAnalysis] = await db
      .update(webAnalysis)
      .set({
        title: scrapedContent.title,
        content: scrapedContent.content,
        summary,
        metadata: scrapedContent.metadata,
        embedding,
        status: "success",
        updatedAt: new Date(),
      })
      .where(eq(webAnalysis.id, pendingAnalysis.id))
      .returning();

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      userId: user.id,
      eventType: "web_analysis",
      eventData: {
        analysisId: completedAnalysis.id,
        url,
        contentLength: scrapedContent.content.length,
        domain: scrapedContent.metadata.domain,
        wordCount: scrapedContent.metadata.wordCount,
        chunksGenerated: chunks.length,
      },
    });

    revalidatePath(`/t/${tenantId}/web-analysis`);
    console.log(`🎉 Analysis completed successfully for ${url}`);
    
    return { success: true, analysis: completedAnalysis, isNew: true };

  } catch (error: any) {
    console.error(`❌ Analysis failed for ${url}:`, error);

    // Update record with error
    try {
      await db
        .update(webAnalysis)
        .set({
          status: "failed",
          errorMessage: error.message,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(webAnalysis.tenantId, tenantId),
            eq(webAnalysis.url, url),
            eq(webAnalysis.status, "processing")
          )
        );
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }

    throw new Error(`Failed to analyze URL: ${error.message}`);
  }
}

/**
 * Generate a summary of content using AI
 */
async function generateContentSummary(content: string, title: string): Promise<string> {
  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { PromptTemplate } = await import("@langchain/core/prompts");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const summaryPrompt = PromptTemplate.fromTemplate(`
Please provide a concise summary of the following web content. Focus on the main points, key information, and overall purpose.

Title: {title}

Content: {content}

Summary (max 500 words):
`);

    const prompt = await summaryPrompt.format({
      title: title || "Web Content",
      content: content.slice(0, 8000), // Limit input to prevent token overflow
    });

    const response = await llm.invoke(prompt);
    return response.content as string;
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return "Summary generation failed.";
  }
}

/**
 * Get all web analyses for a tenant
 */
export async function getWebAnalyses(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const analyses = await db
    .select({
      id: webAnalysis.id,
      url: webAnalysis.url,
      title: webAnalysis.title,
      content: webAnalysis.content,
      summary: webAnalysis.summary,
      metadata: webAnalysis.metadata,
      status: webAnalysis.status,
      errorMessage: webAnalysis.errorMessage,
      analyzedBy: webAnalysis.analyzedBy,
      createdAt: webAnalysis.createdAt,
      updatedAt: webAnalysis.updatedAt,
    })
    .from(webAnalysis)
    .where(eq(webAnalysis.tenantId, tenantId))
    .orderBy(desc(webAnalysis.createdAt));

  return analyses;
}

/**
 * Get a specific web analysis by ID
 */
export async function getWebAnalysis(tenantId: string, analysisId: string) {
  await requireAuth(tenantId, "viewer");

  const [analysis] = await db
    .select()
    .from(webAnalysis)
    .where(
      and(
        eq(webAnalysis.id, analysisId),
        eq(webAnalysis.tenantId, tenantId)
      )
    )
    .limit(1);

  return analysis;
}

/**
 * Search web analyses by URL or content
 */
export async function searchWebAnalyses(tenantId: string, query: string) {
  await requireAuth(tenantId, "viewer");

  const analyses = await db
    .select({
      id: webAnalysis.id,
      url: webAnalysis.url,
      title: webAnalysis.title,
      content: webAnalysis.content,
      summary: webAnalysis.summary,
      metadata: webAnalysis.metadata,
      status: webAnalysis.status,
      createdAt: webAnalysis.createdAt,
    })
    .from(webAnalysis)
    .where(
      and(
        eq(webAnalysis.tenantId, tenantId),
        eq(webAnalysis.status, "success"),
        like(webAnalysis.content, `%${query}%`)
      )
    )
    .orderBy(desc(webAnalysis.createdAt))
    .limit(20);

  return analyses;
}

/**
 * Delete a web analysis
 */
export async function deleteWebAnalysis(tenantId: string, analysisId: string) {
  await requireAuth(tenantId, "contributor");

  await db
    .delete(webAnalysis)
    .where(
      and(
        eq(webAnalysis.id, analysisId),
        eq(webAnalysis.tenantId, tenantId)
      )
    );

  revalidatePath(`/t/${tenantId}/web-analysis`);
  return { success: true };
}

/**
 * Re-analyze an existing URL
 */
export async function reanalyzeUrl(tenantId: string, analysisId: string) {
  await requireAuth(tenantId, "contributor");

  const [existingAnalysis] = await db
    .select({ url: webAnalysis.url })
    .from(webAnalysis)
    .where(
      and(
        eq(webAnalysis.id, analysisId),
        eq(webAnalysis.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existingAnalysis) {
    throw new Error("Analysis not found");
  }

  // Delete old analysis
  await db
    .delete(webAnalysis)
    .where(eq(webAnalysis.id, analysisId));

  // Analyze again
  return await analyzeUrl(tenantId, existingAnalysis.url, {
    waitForDynamic: true, // Use dynamic scraping for re-analysis
    generateSummary: true,
  });
}

/**
 * Get web analysis statistics for a tenant
 */
export async function getWebAnalysisStats(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const stats = await db
    .select({
      id: webAnalysis.id,
      status: webAnalysis.status,
    })
    .from(webAnalysis)
    .where(eq(webAnalysis.tenantId, tenantId));

  const total = stats.length;
  const successful = stats.filter(s => s.status === "success").length;
  const failed = stats.filter(s => s.status === "failed").length;
  const processing = stats.filter(s => s.status === "processing").length;

  return {
    total,
    successful,
    failed,
    processing,
    successRate: total > 0 ? (successful / total) * 100 : 0,
  };
} 