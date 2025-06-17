import cron from "node-cron";
import { db } from "@/server/db";
import { 
  webScrapingJobs, 
  webScrapingCredentials,
  webScrapingJobRuns,
  webAnalysisDocuments,
  webAnalysisChanges,
  documents
} from "@/server/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { EnhancedWebScraper, AuthConfig, CrawlOptions } from "./enhanced-web-scraper";
import { chunkAndEmbedDocument } from "./embeddings";

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "default-key-change-this";

export class WebScrapingScheduler {
  private static instance: WebScrapingScheduler;
  private scheduledJobs = new Map<string, any>();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): WebScrapingScheduler {
    if (!WebScrapingScheduler.instance) {
      WebScrapingScheduler.instance = new WebScrapingScheduler();
    }
    return WebScrapingScheduler.instance;
  }

  /**
   * Initialize the scheduler and load all active jobs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🕐 Initializing Web Scraping Scheduler...");

    try {
      // Get all active jobs
      const activeJobs = await db
        .select()
        .from(webScrapingJobs)
        .where(eq(webScrapingJobs.isActive, true));

      console.log(`📋 Found ${activeJobs.length} active jobs to schedule`);

      // Schedule each job
      for (const job of activeJobs) {
        await this.scheduleJob(job);
      }

      this.isInitialized = true;
      console.log("✅ Web Scraping Scheduler initialized successfully");

    } catch (error) {
      console.error("❌ Failed to initialize scheduler:", error);
      throw error;
    }
  }

  /**
   * Schedule a single job
   */
  async scheduleJob(job: any): Promise<void> {
    try {
      // Validate cron expression
      if (!cron.validate(job.schedule)) {
        console.error(`❌ Invalid cron expression for job ${job.id}: ${job.schedule}`);
        return;
      }

      // Remove existing schedule if it exists
      if (this.scheduledJobs.has(job.id)) {
        this.scheduledJobs.get(job.id)?.stop();
        this.scheduledJobs.delete(job.id);
      }

      // Create new scheduled task
      const task = cron.schedule(job.schedule, async () => {
        await this.executeJob(job.id);
      });

      this.scheduledJobs.set(job.id, task);
      console.log(`⏰ Scheduled job "${job.name}" with cron: ${job.schedule}`);

    } catch (error) {
      console.error(`❌ Failed to schedule job ${job.id}:`, error);
    }
  }

  /**
   * Unschedule a job
   */
  unscheduleJob(jobId: string): void {
    const task = this.scheduledJobs.get(jobId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(jobId);
      console.log(`🛑 Unscheduled job ${jobId}`);
    }
  }

  /**
   * Execute a scraping job
   */
  async executeJob(jobId: string): Promise<void> {
    console.log(`🚀 Starting execution of job ${jobId}`);

    try {
      // Get job details
      const [job] = await db
        .select()
        .from(webScrapingJobs)
        .where(eq(webScrapingJobs.id, jobId))
        .limit(1);

      if (!job) {
        console.error(`❌ Job ${jobId} not found`);
        return;
      }

      if (!job.isActive) {
        console.log(`⏸️ Job ${jobId} is inactive, skipping execution`);
        return;
      }

      // Update job status to running
      await db
        .update(webScrapingJobs)
        .set({
          status: "running",
          lastRun: new Date(),
        })
        .where(eq(webScrapingJobs.id, jobId));

      // Create job run record
      const [jobRun] = await db
        .insert(webScrapingJobRuns)
        .values({
          tenantId: job.tenantId,
          jobId: job.id,
          status: "running",
          startedAt: new Date(),
        })
        .returning();

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

      // Run the scraping
      const scraper = new EnhancedWebScraper(authConfig);
      const crawlOptions: CrawlOptions = {
        maxDepth: job.maxDepth,
        maxPages: 100, // Default limit
        includePatterns: job.includePatterns as string[] || undefined,
        excludePatterns: job.excludePatterns as string[] || undefined,
        waitForDynamic: true,
        delayBetweenRequests: 1000, // 1 second delay
        ...job.options,
      };

      const result = await scraper.crawlWebsite(job.baseUrl, crawlOptions);

      // Process each scraped page
      let documentsCreated = 0;
      let documentsUpdated = 0;
      let changesDetected = 0;

      for (const page of result.pages) {
        const processResult = await this.processScrapedPage(job.tenantId, page, job, jobRun.id);
        
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

      // Update job status and next run time
      await db
        .update(webScrapingJobs)
        .set({
          status: "completed",
          nextRun: this.calculateNextRun(job.schedule),
        })
        .where(eq(webScrapingJobs.id, jobId));

      console.log(`✅ Job ${jobId} completed successfully: ${documentsCreated} created, ${documentsUpdated} updated, ${changesDetected} changes`);

    } catch (error: any) {
      console.error(`❌ Job ${jobId} failed:`, error);

      // Update job status
      await db
        .update(webScrapingJobs)
        .set({
          status: "failed",
          nextRun: this.calculateNextRun(job.schedule),
        })
        .where(eq(webScrapingJobs.id, jobId));

      // Update job run with error
      await db
        .update(webScrapingJobRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: error.message,
        })
        .where(eq(webScrapingJobRuns.jobId, jobId));
    }
  }

  /**
   * Process a scraped page and store/update in database
   */
  private async processScrapedPage(
    tenantId: string,
    page: any,
    job: any,
    jobRunId: string
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
            analyzedBy: job.createdBy, // Use job creator as analyzer
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

        // Create/update knowledge base document
        await this.updateKnowledgeBaseDocument(tenantId, newDoc);
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
          analyzedBy: job.createdBy,
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
      await this.updateKnowledgeBaseDocument(tenantId, newDoc);
    }

    return { isNew, hasChanges };
  }

  /**
   * Create or update knowledge base document
   */
  private async updateKnowledgeBaseDocument(tenantId: string, webDoc: any): Promise<void> {
    const chunks = await chunkAndEmbedDocument(webDoc.content, {
      fileName: webDoc.title || `Web Page: ${webDoc.url}`,
      fileType: "web-page",
      tenantId,
    });

    // Check if knowledge base document already exists for this URL
    const [existingKbDoc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.name, webDoc.title || `Web Analysis: ${webDoc.url}`)
        )
      )
      .limit(1);

    if (existingKbDoc) {
      // Update existing document
      await db
        .update(documents)
        .set({
          content: webDoc.content,
          summary: `Web page scraped from ${webDoc.url} (Updated: ${new Date().toISOString()})`,
          embedding: chunks.length > 0 ? chunks[0].embedding : null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, existingKbDoc.id));
    } else {
      // Create new document
      await db.insert(documents).values({
        tenantId,
        name: webDoc.title || `Web Analysis: ${webDoc.url}`,
        content: webDoc.content,
        summary: `Web page scraped from ${webDoc.url}`,
        fileType: "web-page",
        embedding: chunks.length > 0 ? chunks[0].embedding : null,
        uploadedBy: webDoc.analyzedBy,
      });
    }
  }

  /**
   * Calculate next run time for a cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simple implementation - in production, use a proper cron library
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // Default to next hour
    return nextHour;
  }

  /**
   * Reload all jobs (useful when jobs are added/modified)
   */
  async reloadJobs(): Promise<void> {
    console.log("🔄 Reloading all scheduled jobs...");

    // Stop all existing tasks
    for (const [jobId, task] of this.scheduledJobs) {
      task.stop();
    }
    this.scheduledJobs.clear();

    // Reload active jobs
    const activeJobs = await db
      .select()
      .from(webScrapingJobs)
      .where(eq(webScrapingJobs.isActive, true));

    for (const job of activeJobs) {
      await this.scheduleJob(job);
    }

    console.log(`✅ Reloaded ${activeJobs.length} jobs`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isInitialized: boolean;
    scheduledJobsCount: number;
    scheduledJobs: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      scheduledJobsCount: this.scheduledJobs.size,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
    };
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    console.log("🛑 Shutting down Web Scraping Scheduler...");
    
    for (const [jobId, task] of this.scheduledJobs) {
      task.stop();
    }
    this.scheduledJobs.clear();
    this.isInitialized = false;
    
    console.log("✅ Scheduler shutdown complete");
  }
}

// Export singleton instance
export const webScrapingScheduler = WebScrapingScheduler.getInstance(); 