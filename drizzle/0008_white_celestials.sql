CREATE TABLE "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kb_bulk_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"tenant_ids" text[],
	"template_id" uuid,
	"configuration" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"processed_count" integer DEFAULT 0,
	"total_count" integer DEFAULT 0,
	"error_log" jsonb,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "kb_connection_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_weight" real DEFAULT 1,
	"default_access_level" varchar(20) DEFAULT 'read',
	"include_tags" text[],
	"exclude_tags" text[],
	"is_system_template" boolean DEFAULT false,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_tenant_id" uuid NOT NULL,
	"target_tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"access_level" varchar(20) DEFAULT 'read' NOT NULL,
	"include_tags" text[],
	"exclude_tags" text[],
	"include_document_types" text[],
	"exclude_document_types" text[],
	"weight" real DEFAULT 1,
	"max_results" integer DEFAULT 5,
	"min_similarity" real DEFAULT 0.7,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"is_active" boolean DEFAULT false,
	"auto_approve" boolean DEFAULT false,
	"requires_review" boolean DEFAULT true,
	"expires_at" timestamp,
	"template_id" uuid,
	"created_by" varchar(255) NOT NULL,
	"approved_by" varchar(255),
	"rejected_by" varchar(255),
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reference_usage_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" uuid NOT NULL,
	"query_session_id" uuid,
	"documents_retrieved" integer DEFAULT 0,
	"relevance_score" real,
	"used_in_response" boolean DEFAULT false,
	"response_quality" integer,
	"query_time_ms" integer,
	"cache_hit" boolean DEFAULT false,
	"query_text" text,
	"user_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_bulk_operations" ADD CONSTRAINT "kb_bulk_operations_template_id_kb_connection_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."kb_connection_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_bulk_operations" ADD CONSTRAINT "kb_bulk_operations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_connection_templates" ADD CONSTRAINT "kb_connection_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_source_tenant_id_tenants_id_fk" FOREIGN KEY ("source_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_template_id_kb_connection_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."kb_connection_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_references" ADD CONSTRAINT "knowledge_base_references_rejected_by_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_usage_analytics" ADD CONSTRAINT "reference_usage_analytics_reference_id_knowledge_base_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."knowledge_base_references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_usage_analytics" ADD CONSTRAINT "reference_usage_analytics_query_session_id_chat_sessions_id_fk" FOREIGN KEY ("query_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_usage_analytics" ADD CONSTRAINT "reference_usage_analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_tags_document_id_idx" ON "document_tags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_tags_tag_idx" ON "document_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "doc_tags_unique" ON "document_tags" USING btree ("document_id","tag");--> statement-breakpoint
CREATE INDEX "kb_bulk_ops_status_idx" ON "kb_bulk_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_bulk_ops_created_by_idx" ON "kb_bulk_operations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "kb_bulk_ops_created_at_idx" ON "kb_bulk_operations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kb_templates_name_idx" ON "kb_connection_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "kb_templates_created_by_idx" ON "kb_connection_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "kb_refs_source_tenant_idx" ON "knowledge_base_references" USING btree ("source_tenant_id");--> statement-breakpoint
CREATE INDEX "kb_refs_target_tenant_idx" ON "knowledge_base_references" USING btree ("target_tenant_id");--> statement-breakpoint
CREATE INDEX "kb_refs_status_idx" ON "knowledge_base_references" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_refs_template_idx" ON "knowledge_base_references" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "kb_refs_unique_active" ON "knowledge_base_references" USING btree ("source_tenant_id","target_tenant_id","status");--> statement-breakpoint
CREATE INDEX "ref_usage_reference_id_idx" ON "reference_usage_analytics" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "ref_usage_created_at_idx" ON "reference_usage_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ref_usage_response_quality_idx" ON "reference_usage_analytics" USING btree ("response_quality");