"use server";

import { db } from "@/server/db";
import {
  webScrapingCredentials,
  webScrapingJobs,
  webAnalysisDocuments,
  webAnalysisChanges,
  webScrapingJobRuns,
  documents,
} from "@/server/db/schema";
import { eq, and, desc, like, gte, lte } from "drizzle-orm";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";
import { EnhancedWebScraper, AuthConfig, CrawlOptions } from "@/lib/enhanced-web-scraper";
import { chunkAndEmbedDocument } from "@/lib/embeddings";
import cron from "node-cron";

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "default-key-change-this";

// =============================================================================
// CREDENTIAL MANAGEMENT
// =============================================================================

export interface CredentialData {
  id: string;
  name: string;
  domain: string;
  authType: string;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Create or update web scraping credentials
 */
export async function saveWebScrapingCredentials(
  tenantId: string,
  data: {
    id?: string;
    name: string;
    domain: string;
    authType: 'basic' | 'form' | 'cookie' | 'header' | 'sso';
    credentials: AuthConfig['credentials'];
  }
) {
  const user = await requireAuth(tenantId, "contributor");

  // Encrypt sensitive credentials
  const encryptedCredentials = EnhancedWebScraper.encryptCredentials(data.credentials, ENCRYPTION_KEY);

  if (data.id) {
    // Update existing credential
    const [updatedCredential] = await db
      .update(webScrapingCredentials)
      .set({
        name: data.name,
        domain: data.domain,
        authType: data.authType,
        credentials: encryptedCredentials,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webScrapingCredentials.id, data.id),
          eq(webScrapingCredentials.tenantId, tenantId)
        )
      )
      .returning();

    revalidatePath(`/t/${tenantId}/web-analysis/credentials`);
    return { success: true, credential: updatedCredential };
  } else {
    // Create new credential
    const [newCredential] = await db
      .insert(webScrapingCredentials)
      .values({
        tenantId,
        name: data.name,
        domain: data.domain,
        authType: data.authType,
        credentials: encryptedCredentials,
        createdBy: user.id,
      })
      .returning();

    revalidatePath(`/t/${tenantId}/web-analysis/credentials`);
    return { success: true, credential: newCredential };
  }
}

/**
 * Get all credentials for a tenant
 */
export async function getWebScrapingCredentials(tenantId: string): Promise<CredentialData[]> {
  await requireAuth(tenantId, "viewer");

  const credentials = await db
    .select({
      id: webScrapingCredentials.id,
      name: webScrapingCredentials.name,
      domain: webScrapingCredentials.domain,
      authType: webScrapingCredentials.authType,
      isActive: webScrapingCredentials.isActive,
      createdAt: webScrapingCredentials.createdAt,
      updatedAt: webScrapingCredentials.updatedAt,
    })
    .from(webScrapingCredentials)
    .where(eq(webScrapingCredentials.tenantId, tenantId))
    .orderBy(desc(webScrapingCredentials.createdAt));

  return credentials;
}

/**
 * Delete web scraping credentials
 */
export async function deleteWebScrapingCredentials(tenantId: string, credentialId: string) {
  await requireAuth(tenantId, "contributor");

  await db
    .delete(webScrapingCredentials)
    .where(
      and(
        eq(webScrapingCredentials.id, credentialId),
        eq(webScrapingCredentials.tenantId, tenantId)
      )
    );

  revalidatePath(`/t/${tenantId}/web-analysis/credentials`);
  return { success: true };
}

// =============================================================================
// SCRAPING JOB MANAGEMENT
// =============================================================================

export interface ScrapingJobData {
  id: string;
  name: string;
  baseUrl: string;
  scrapeChildren: boolean;
  maxDepth: number;
  schedule: string;
  isActive: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  status: string;
  credentialName?: string;
  createdAt: Date | null;
}

/**
 * Create or update a scraping job
 */
export async function saveScrapingJob(
  tenantId: string,
  data: {
    id?: string;
    name: string;
    baseUrl: string;
    scrapeChildren: boolean;
    maxDepth: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    credentialId?: string;
    schedule: string;
    options?: any;
  }
) {
  const user = await requireAuth(tenantId, "contributor");

  // Validate cron expression
  if (!cron.validate(data.schedule)) {
    throw new Error("Invalid cron expression");
  }

  // Calculate next run time
  const nextRun = getNextCronTime(data.schedule);

  if (data.id) {
    // Update existing job
    const [updatedJob] = await db
      .update(webScrapingJobs)
      .set({
        name: data.name,
        baseUrl: data.baseUrl,
        scrapeChildren: data.scrapeChildren,
        maxDepth: data.maxDepth,
        includePatterns: data.includePatterns,
        excludePatterns: data.excludePatterns,
        credentialId: data.credentialId,
        schedule: data.schedule,
        nextRun,
        options: data.options,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webScrapingJobs.id, data.id),
          eq(webScrapingJobs.tenantId, tenantId)
        )
      )
      .returning();

    revalidatePath(`/t/${tenantId}/web-analysis/jobs`);
    return { success: true, job: updatedJob };
  } else {
    // Create new job
    const [newJob] = await db
      .insert(webScrapingJobs)
      .values({
        tenantId,
        name: data.name,
        baseUrl: data.baseUrl,
        scrapeChildren: data.scrapeChildren,
        maxDepth: data.maxDepth,
        includePatterns: data.includePatterns,
        excludePatterns: data.excludePatterns,
        credentialId: data.credentialId,
        schedule: data.schedule,
        nextRun,
        options: data.options,
        createdBy: user.id,
      })
      .returning();

    revalidatePath(`/t/${tenantId}/web-analysis/jobs`);
    return { success: true, job: newJob };
  }
}

/**
 * Get all scraping jobs for a tenant
 */
export async function getScrapingJobs(tenantId: string): Promise<ScrapingJobData[]> {
  await requireAuth(tenantId, "viewer");

  const jobs = await db
    .select({
      id: webScrapingJobs.id,
      name: webScrapingJobs.name,
      baseUrl: webScrapingJobs.baseUrl,
      scrapeChildren: webScrapingJobs.scrapeChildren,
      maxDepth: webScrapingJobs.maxDepth,
      schedule: webScrapingJobs.schedule,
      isActive: webScrapingJobs.isActive,
      lastRun: webScrapingJobs.lastRun,
      nextRun: webScrapingJobs.nextRun,
      status: webScrapingJobs.status,
      credentialName: webScrapingCredentials.name,
      createdAt: webScrapingJobs.createdAt,
    })
    .from(webScrapingJobs)
    .leftJoin(
      webScrapingCredentials,
      eq(webScrapingJobs.credentialId, webScrapingCredentials.id)
    )
    .where(eq(webScrapingJobs.tenantId, tenantId))
    .orderBy(desc(webScrapingJobs.createdAt));

  return jobs;
}

/**
 * Run a scraping job manually
 */
export async function runScrapingJob(tenantId: string, jobId: string) {
  const user = await requireAuth(tenantId, "contributor");

  // Get job details
  const [job] = await db
    .select()
    .from(webScrapingJobs)
    .where(
      and(
        eq(webScrapingJobs.id, jobId),
        eq(webScrapingJobs.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  // Get credentials if needed
  let authConfig: AuthConfig | undefined;
  if (job.credentialId) {
    const [credential] = await db
      .select()
      .from(webScrapingCredentials)
      .where(eq(webScrapingCredentials.id, job.credentialId))
      .limit(1);

    if (credential) {
      const decryptedCredentials = EnhancedWebScraper.decryptCredentials(
        credential.credentials as string,
        ENCRYPTION_KEY
      );
      authConfig = {
        type: credential.authType as AuthConfig['type'],
        credentials: decryptedCredentials,
      };
    }
  }

  // Create job run record
  const [jobRun] = await db
    .insert(webScrapingJobRuns)
    .values({
      tenantId,
      jobId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  try {
    // Update job status
    await db
      .update(webScrapingJobs)
      .set({
        status: "running",
        lastRun: new Date(),
      })
      .where(eq(webScrapingJobs.id, jobId));

    // Run the scraping
    const scraper = new EnhancedWebScraper(authConfig);
    const crawlOptions: CrawlOptions = {
      maxDepth: job.maxDepth,
      maxPages: 100, // Default limit
      includePatterns: job.includePatterns as string[] || undefined,
      excludePatterns: job.excludePatterns as string[] || undefined,
      waitForDynamic: true,
      delayBetweenRequests: 1000, // 1 second delay
      saveContent: true, // Enable content saving to files
      enableCredentialPrompting: true, // Enable credential prompting for external sites
      ...job.options,
    };

    const result = await scraper.crawlWebsite(job.baseUrl, crawlOptions);

    // Process each scraped page
    let documentsCreated = 0;
    let documentsUpdated = 0;
    let changesDetected = 0;

    for (const page of result.pages) {
      const processResult = await processScrapedPage(tenantId, page, job, jobRun.id, user.id);
      
      if (processResult.isNew) {
        documentsCreated++;
      } else if (processResult.hasChanges) {
        documentsUpdated++;
        changesDetected++;
      }
    }

    // Update job run with results
    await db
      .update(webScrapingJobRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        urlsProcessed: result.summary.totalPages,
        urlsSuccessful: result.summary.successfulPages,
        urlsFailed: result.summary.failedPages,
        documentsCreated,
        documentsUpdated,
        changesDetected,
        logs: result.summary.errors,
      })
      .where(eq(webScrapingJobRuns.id, jobRun.id));

    // Update job status
    await db
      .update(webScrapingJobs)
      .set({
        status: "completed",
        nextRun: getNextCronTime(job.schedule),
      })
      .where(eq(webScrapingJobs.id, jobId));

    revalidatePath(`/t/${tenantId}/web-analysis`);
    return { success: true, result: { documentsCreated, documentsUpdated, changesDetected } };

  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error);

    // Update job run with error
    await db
      .update(webScrapingJobRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error.message,
      })
      .where(eq(webScrapingJobRuns.id, jobRun.id));

    // Update job status
    await db
      .update(webScrapingJobs)
      .set({
        status: "failed",
        nextRun: getNextCronTime(job.schedule),
      })
      .where(eq(webScrapingJobs.id, jobId));

    throw error;
  }
}

// =============================================================================
// DOCUMENT PROCESSING
// =============================================================================

/**
 * Process a scraped page and store/update in database
 */
async function processScrapedPage(
  tenantId: string,
  page: any,
  job: any,
  jobRunId: string,
  userId: string
): Promise<{ isNew: boolean; hasChanges: boolean }> {
  // Check if document already exists
  const [existingDoc] = await db
    .select()
    .from(webAnalysisDocuments)
    .where(
      and(
        eq(webAnalysisDocuments.tenantId, tenantId),
        eq(webAnalysisDocuments.url, page.url)
      )
    )
    .orderBy(desc(webAnalysisDocuments.version))
    .limit(1);

  const isNew = !existingDoc;
  let hasChanges = false;

  if (existingDoc) {
    // Compare content for changes
    const changes = EnhancedWebScraper.calculateContentChanges(
      existingDoc.content,
      page.content
    );

    hasChanges = changes.hasSignificantChanges;

    if (hasChanges) {
      // Create new version
      const newVersion = existingDoc.version + 1;

      // Generate embedding for new content
      const chunks = await chunkAndEmbedDocument(page.content, {
        fileName: page.title,
        fileType: "web-page",
        tenantId,
      });

      const embedding = chunks.length > 0 ? chunks[0].embedding : null;

      const [newDoc] = await db
        .insert(webAnalysisDocuments)
        .values({
          tenantId,
          jobId: job.id,
          url: page.url,
          parentUrl: page.metadata.parentUrl,
          title: page.title,
          content: page.content,
          metadata: page.metadata,
          embedding,
          contentHash: page.contentHash,
          version: newVersion,
          depth: page.metadata.depth,
          analyzedBy: userId,
        })
        .returning();

      // Log the change
      await db
        .insert(webAnalysisChanges)
        .values({
          tenantId,
          documentId: newDoc.id,
          jobRunId,
          changeType: "updated",
          oldContent: existingDoc.content,
          newContent: page.content,
          oldContentHash: existingDoc.contentHash,
          newContentHash: page.contentHash,
          changePercentage: changes.changePercentage,
          changeSummary: changes.changeSummary,
        });

      // Deactivate old version
      await db
        .update(webAnalysisDocuments)
        .set({ isActive: false })
        .where(eq(webAnalysisDocuments.id, existingDoc.id));

      // Also create a knowledge base document
      await createKnowledgeBaseDocument(tenantId, newDoc, userId);
    }
  } else {
    // Generate embedding for new content
    const chunks = await chunkAndEmbedDocument(page.content, {
      fileName: page.title,
      fileType: "web-page",
      tenantId,
    });

    const embedding = chunks.length > 0 ? chunks[0].embedding : null;

    // Create new document
    const [newDoc] = await db
      .insert(webAnalysisDocuments)
      .values({
        tenantId,
        jobId: job.id,
        url: page.url,
        parentUrl: page.metadata.parentUrl,
        title: page.title,
        content: page.content,
        metadata: page.metadata,
        embedding,
        contentHash: page.contentHash,
        version: 1,
        depth: page.metadata.depth,
        analyzedBy: userId,
      })
      .returning();

    // Log the creation
    await db
      .insert(webAnalysisChanges)
      .values({
        tenantId,
        documentId: newDoc.id,
        jobRunId,
        changeType: "created",
        newContent: page.content,
        newContentHash: page.contentHash,
        changeSummary: "New document created",
      });

    // Create knowledge base document
    await createKnowledgeBaseDocument(tenantId, newDoc, userId);
  }

  return { isNew, hasChanges };
}

/**
 * Create a knowledge base document from web analysis
 */
async function createKnowledgeBaseDocument(tenantId: string, webDoc: any, userId: string) {
  const chunks = await chunkAndEmbedDocument(webDoc.content, {
    fileName: webDoc.title || `Web Page: ${webDoc.url}`,
    fileType: "web-page",
    tenantId,
  });

  // Create main document record
  await db.insert(documents).values({
    tenantId,
    name: webDoc.title || `Web Analysis: ${webDoc.url}`,
    content: webDoc.content,
    summary: `Web page scraped from ${webDoc.url}`,
    fileType: "web-page",
    embedding: chunks.length > 0 ? chunks[0].embedding : null,
    uploadedBy: userId,
  });
}

// =============================================================================
// CHANGE TRACKING AND REPORTING
// =============================================================================

/**
 * Get change history for a document
 */
export async function getDocumentChanges(tenantId: string, documentId: string) {
  await requireAuth(tenantId, "viewer");

  const changes = await db
    .select()
    .from(webAnalysisChanges)
    .where(
      and(
        eq(webAnalysisChanges.tenantId, tenantId),
        eq(webAnalysisChanges.documentId, documentId)
      )
    )
    .orderBy(desc(webAnalysisChanges.detectedAt));

  return changes;
}

/**
 * Get recent changes across all documents
 */
export async function getRecentChanges(tenantId: string, limit = 50) {
  await requireAuth(tenantId, "viewer");

  const changes = await db
    .select({
      id: webAnalysisChanges.id,
      changeType: webAnalysisChanges.changeType,
      changePercentage: webAnalysisChanges.changePercentage,
      changeSummary: webAnalysisChanges.changeSummary,
      detectedAt: webAnalysisChanges.detectedAt,
      documentUrl: webAnalysisDocuments.url,
      documentTitle: webAnalysisDocuments.title,
    })
    .from(webAnalysisChanges)
    .leftJoin(
      webAnalysisDocuments,
      eq(webAnalysisChanges.documentId, webAnalysisDocuments.id)
    )
    .where(eq(webAnalysisChanges.tenantId, tenantId))
    .orderBy(desc(webAnalysisChanges.detectedAt))
    .limit(limit);

  return changes;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate next cron time
 */
function getNextCronTime(cronExpression: string): Date {
  // Simple implementation - in production, use a proper cron library
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // Default to next hour
  return nextHour;
}

/**
 * Toggle job active status
 */
export async function toggleJobStatus(tenantId: string, jobId: string) {
  await requireAuth(tenantId, "contributor");

  const [job] = await db
    .select({ isActive: webScrapingJobs.isActive })
    .from(webScrapingJobs)
    .where(
      and(
        eq(webScrapingJobs.id, jobId),
        eq(webScrapingJobs.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  await db
    .update(webScrapingJobs)
    .set({
      isActive: !job.isActive,
      updatedAt: new Date(),
    })
    .where(eq(webScrapingJobs.id, jobId));

  revalidatePath(`/t/${tenantId}/web-analysis/jobs`);
  return { success: true };
}

/**
 * Delete a scraping job
 */
export async function deleteScrapingJob(tenantId: string, jobId: string) {
  await requireAuth(tenantId, "contributor");

  await db
    .delete(webScrapingJobs)
    .where(
      and(
        eq(webScrapingJobs.id, jobId),
        eq(webScrapingJobs.tenantId, tenantId)
      )
    );

  revalidatePath(`/t/${tenantId}/web-analysis/jobs`);
  return { success: true };
} 