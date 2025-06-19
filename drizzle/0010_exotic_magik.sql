CREATE TYPE "public"."template_category" AS ENUM('document', 'prompt', 'workflow', 'integration', 'other');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "template_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"user_id" varchar(255),
	"tenant_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"downloaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "template_category" DEFAULT 'document' NOT NULL,
	"tags" text[],
	"content" jsonb NOT NULL,
	"file_url" text,
	"file_type" varchar(50),
	"file_size" integer,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"status" "template_status" DEFAULT 'pending' NOT NULL,
	"submission_notes" text,
	"review_notes" text,
	"submitted_by" varchar(255) NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"submitted_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "template_category" DEFAULT 'document' NOT NULL,
	"tags" text[],
	"content" jsonb NOT NULL,
	"file_url" text,
	"file_type" varchar(50),
	"file_size" integer,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"download_count" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"is_public" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255) NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ALTER COLUMN "min_similarity" SET DEFAULT 0.1;--> statement-breakpoint
ALTER TABLE "template_downloads" ADD CONSTRAINT "template_downloads_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_downloads" ADD CONSTRAINT "template_downloads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_downloads" ADD CONSTRAINT "template_downloads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_downloads_template_id_idx" ON "template_downloads" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_downloads_user_id_idx" ON "template_downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "template_downloads_tenant_id_idx" ON "template_downloads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "template_downloads_downloaded_at_idx" ON "template_downloads" USING btree ("downloaded_at");--> statement-breakpoint
CREATE INDEX "template_ratings_template_id_idx" ON "template_ratings" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_ratings_user_id_idx" ON "template_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "template_ratings_unique_idx" ON "template_ratings" USING btree ("template_id","user_id");--> statement-breakpoint
CREATE INDEX "template_submissions_status_idx" ON "template_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "template_submissions_category_idx" ON "template_submissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "template_submissions_submitted_by_idx" ON "template_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "template_submissions_reviewed_by_idx" ON "template_submissions" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "template_submissions_submitted_at_idx" ON "template_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "templates_created_by_idx" ON "templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "templates_approved_by_idx" ON "templates" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "templates_is_public_idx" ON "templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "templates_is_active_idx" ON "templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "templates_rating_idx" ON "templates" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "templates_created_at_idx" ON "templates" USING btree ("created_at");