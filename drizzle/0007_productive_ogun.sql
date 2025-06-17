CREATE TABLE "web_analysis_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"job_run_id" uuid,
	"change_type" varchar(50) NOT NULL,
	"old_content" text,
	"new_content" text,
	"old_content_hash" text,
	"new_content_hash" text,
	"change_percentage" real,
	"change_summary" text,
	"metadata" jsonb,
	"detected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_analysis_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid,
	"url" text NOT NULL,
	"parent_url" text,
	"title" text,
	"content" text NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"embedding" vector(1536),
	"content_hash" text NOT NULL,
	"version" integer DEFAULT 1,
	"status" varchar(50) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"depth" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"analyzed_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_scraping_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"auth_type" varchar(50) NOT NULL,
	"credentials" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_scraping_job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"urls_processed" integer DEFAULT 0,
	"urls_successful" integer DEFAULT 0,
	"urls_failed" integer DEFAULT 0,
	"documents_created" integer DEFAULT 0,
	"documents_updated" integer DEFAULT 0,
	"changes_detected" integer DEFAULT 0,
	"error_message" text,
	"logs" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "web_scraping_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"scrape_children" boolean DEFAULT true,
	"max_depth" integer DEFAULT 2,
	"include_patterns" jsonb,
	"exclude_patterns" jsonb,
	"credential_id" uuid,
	"schedule" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_run" timestamp,
	"next_run" timestamp,
	"status" varchar(50) DEFAULT 'idle',
	"options" jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "web_analysis_changes" ADD CONSTRAINT "web_analysis_changes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_analysis_changes" ADD CONSTRAINT "web_analysis_changes_document_id_web_analysis_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."web_analysis_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_analysis_documents" ADD CONSTRAINT "web_analysis_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_analysis_documents" ADD CONSTRAINT "web_analysis_documents_job_id_web_scraping_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."web_scraping_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_analysis_documents" ADD CONSTRAINT "web_analysis_documents_analyzed_by_user_id_fk" FOREIGN KEY ("analyzed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_credentials" ADD CONSTRAINT "web_scraping_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_credentials" ADD CONSTRAINT "web_scraping_credentials_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_job_runs" ADD CONSTRAINT "web_scraping_job_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_job_runs" ADD CONSTRAINT "web_scraping_job_runs_job_id_web_scraping_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."web_scraping_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_jobs" ADD CONSTRAINT "web_scraping_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_jobs" ADD CONSTRAINT "web_scraping_jobs_credential_id_web_scraping_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."web_scraping_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scraping_jobs" ADD CONSTRAINT "web_scraping_jobs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_analysis_changes_tenant_id_idx" ON "web_analysis_changes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_analysis_changes_document_id_idx" ON "web_analysis_changes" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "web_analysis_changes_job_run_id_idx" ON "web_analysis_changes" USING btree ("job_run_id");--> statement-breakpoint
CREATE INDEX "web_analysis_changes_change_type_idx" ON "web_analysis_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "web_analysis_changes_detected_at_idx" ON "web_analysis_changes" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_tenant_id_idx" ON "web_analysis_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_job_id_idx" ON "web_analysis_documents" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_url_idx" ON "web_analysis_documents" USING btree ("url");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_parent_url_idx" ON "web_analysis_documents" USING btree ("parent_url");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_content_hash_idx" ON "web_analysis_documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_version_idx" ON "web_analysis_documents" USING btree ("version");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_is_active_idx" ON "web_analysis_documents" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "web_analysis_documents_embedding_idx" ON "web_analysis_documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "web_scraping_credentials_tenant_id_idx" ON "web_scraping_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_scraping_credentials_domain_idx" ON "web_scraping_credentials" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "web_scraping_credentials_auth_type_idx" ON "web_scraping_credentials" USING btree ("auth_type");--> statement-breakpoint
CREATE INDEX "web_scraping_job_runs_tenant_id_idx" ON "web_scraping_job_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_scraping_job_runs_job_id_idx" ON "web_scraping_job_runs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "web_scraping_job_runs_status_idx" ON "web_scraping_job_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "web_scraping_job_runs_started_at_idx" ON "web_scraping_job_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "web_scraping_jobs_tenant_id_idx" ON "web_scraping_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_scraping_jobs_base_url_idx" ON "web_scraping_jobs" USING btree ("base_url");--> statement-breakpoint
CREATE INDEX "web_scraping_jobs_status_idx" ON "web_scraping_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "web_scraping_jobs_next_run_idx" ON "web_scraping_jobs" USING btree ("next_run");--> statement-breakpoint
CREATE INDEX "web_scraping_jobs_is_active_idx" ON "web_scraping_jobs" USING btree ("is_active");