CREATE TYPE "public"."agent_capability" AS ENUM('search', 'analyze', 'generate', 'validate', 'transform', 'integrate', 'monitor', 'audit');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('active', 'inactive', 'maintenance', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('knowledge_base', 'business_rules', 'testing', 'workflow', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."compliance_framework" AS ENUM('SOC2', 'GDPR', 'HIPAA', 'ISO27001', 'PCI_DSS');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."template_access" AS ENUM('public', 'tenant_only', 'creator_only', 'admin_only');--> statement-breakpoint
CREATE TABLE "agent_communication_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_agent_id" uuid NOT NULL,
	"target_agent_id" uuid NOT NULL,
	"tenant_id" uuid,
	"user_id" varchar(255),
	"operation_type" varchar(50) NOT NULL,
	"request_data" jsonb,
	"response_data" jsonb,
	"status" "operation_status" NOT NULL,
	"duration_ms" integer,
	"tokens_used" integer,
	"encrypted" boolean DEFAULT true,
	"data_classification" varchar(20) DEFAULT 'internal',
	"error_code" varchar(50),
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tenant_id" uuid,
	"status" varchar(20) NOT NULL,
	"response_time" integer,
	"error_rate" real DEFAULT 0,
	"success_rate" real DEFAULT 100,
	"requests_per_minute" integer DEFAULT 0,
	"avg_tokens_per_request" real,
	"memory_usage_mb" real,
	"cpu_usage_percent" real,
	"uptime_seconds" integer,
	"last_health_check" timestamp DEFAULT now(),
	"last_error" text,
	"last_error_at" timestamp,
	"encryption_status" boolean DEFAULT true,
	"audit_compliance" boolean DEFAULT true,
	"data_retention_compliance" boolean DEFAULT true,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "agent_type" NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"description" text NOT NULL,
	"base_route" varchar(100) NOT NULL,
	"api_endpoint" varchar(255),
	"health_check_endpoint" varchar(255),
	"capabilities" "agent_capability"[] DEFAULT '{}' NOT NULL,
	"dependencies" text[] DEFAULT '{}',
	"interface_schema" jsonb,
	"default_config" jsonb DEFAULT '{}' NOT NULL,
	"resource_limits" jsonb,
	"security_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"is_core" boolean DEFAULT false,
	"maintenance_mode" boolean DEFAULT false,
	"compliance_frameworks" "compliance_framework"[] DEFAULT '{}',
	"audit_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"data_retention_days" integer DEFAULT 365,
	"icon" varchar(50) DEFAULT 'Bot',
	"color" varchar(20) DEFAULT 'blue',
	"tags" text[] DEFAULT '{}',
	"documentation" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tenant_id" uuid,
	"user_id" varchar(255),
	"event_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"source_ip" varchar(45),
	"user_agent" text,
	"request_path" varchar(255),
	"request_data" jsonb,
	"blocked" boolean DEFAULT false,
	"resolved" boolean DEFAULT false,
	"resolved_by" varchar(255),
	"resolved_at" timestamp,
	"resolution_notes" text,
	"compliance_framework" "compliance_framework",
	"risk_score" integer,
	"reported_to_authorities" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" varchar(100) DEFAULT 'bg-indigo-50 border-indigo-200 text-indigo-700',
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_collection_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"assigned_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" varchar(20) NOT NULL,
	"version_notes" text,
	"content" jsonb NOT NULL,
	"file_url" text,
	"file_type" varchar(50),
	"file_size" integer,
	"file_name" text,
	"status" "template_status" DEFAULT 'pending' NOT NULL,
	"is_current_version" boolean DEFAULT false,
	"created_by" varchar(255) NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"access_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"allowed_users" text[],
	"restricted_users" text[],
	"custom_config" jsonb DEFAULT '{}',
	"resource_overrides" jsonb,
	"feature_flags" jsonb DEFAULT '{}',
	"daily_request_limit" integer,
	"monthly_request_limit" integer,
	"token_quota_daily" integer,
	"token_quota_monthly" integer,
	"encryption_required" boolean DEFAULT false,
	"auditing_required" boolean DEFAULT true,
	"ip_whitelist" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP INDEX "templates_is_public_idx";--> statement-breakpoint
ALTER TABLE "template_submissions" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD COLUMN "version_notes" text;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD COLUMN "access_level" "template_access" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "current_version" varchar(20) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "access_level" "template_access" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_source_agent_id_agent_registry_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_target_agent_id_agent_registry_id_fk" FOREIGN KEY ("target_agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_health_metrics" ADD CONSTRAINT "agent_health_metrics_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_health_metrics" ADD CONSTRAINT "agent_health_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_collections" ADD CONSTRAINT "custom_collections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_collections" ADD CONSTRAINT "custom_collections_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collection_assignments" ADD CONSTRAINT "document_collection_assignments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collection_assignments" ADD CONSTRAINT "document_collection_assignments_collection_id_custom_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."custom_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collection_assignments" ADD CONSTRAINT "document_collection_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_comm_source_idx" ON "agent_communication_log" USING btree ("source_agent_id");--> statement-breakpoint
CREATE INDEX "agent_comm_target_idx" ON "agent_communication_log" USING btree ("target_agent_id");--> statement-breakpoint
CREATE INDEX "agent_comm_tenant_idx" ON "agent_communication_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_comm_user_idx" ON "agent_communication_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_comm_operation_idx" ON "agent_communication_log" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "agent_comm_status_idx" ON "agent_communication_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_comm_timestamp_idx" ON "agent_communication_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "agent_health_agent_id_idx" ON "agent_health_metrics" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_health_tenant_id_idx" ON "agent_health_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_health_status_idx" ON "agent_health_metrics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_health_timestamp_idx" ON "agent_health_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "agent_registry_type_idx" ON "agent_registry" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agent_registry_status_idx" ON "agent_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_registry_is_core_idx" ON "agent_registry" USING btree ("is_core");--> statement-breakpoint
CREATE INDEX "agent_registry_security_level_idx" ON "agent_registry" USING btree ("security_level");--> statement-breakpoint
CREATE INDEX "agent_security_agent_id_idx" ON "agent_security_events" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_security_tenant_id_idx" ON "agent_security_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_security_event_type_idx" ON "agent_security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "agent_security_severity_idx" ON "agent_security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "agent_security_resolved_idx" ON "agent_security_events" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "agent_security_timestamp_idx" ON "agent_security_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "custom_collections_tenant_id_idx" ON "custom_collections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_collections_created_by_idx" ON "custom_collections" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "doc_collection_assignments_doc_id_idx" ON "document_collection_assignments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_collection_assignments_collection_id_idx" ON "document_collection_assignments" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "doc_collection_unique_assignment" ON "document_collection_assignments" USING btree ("document_id","collection_id");--> statement-breakpoint
CREATE INDEX "template_versions_template_id_idx" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_versions_version_idx" ON "template_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "template_versions_status_idx" ON "template_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "template_versions_is_current_idx" ON "template_versions" USING btree ("is_current_version");--> statement-breakpoint
CREATE INDEX "template_versions_created_by_idx" ON "template_versions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "template_versions_created_at_idx" ON "template_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "template_versions_template_current_idx" ON "template_versions" USING btree ("template_id","is_current_version");--> statement-breakpoint
CREATE INDEX "tenant_agents_tenant_id_idx" ON "tenant_agent_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_agents_agent_id_idx" ON "tenant_agent_configs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "tenant_agents_is_enabled_idx" ON "tenant_agent_configs" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "tenant_agents_unique" ON "tenant_agent_configs" USING btree ("tenant_id","agent_id");--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_submissions" ADD CONSTRAINT "template_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_submissions_template_id_idx" ON "template_submissions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templates_access_level_idx" ON "templates" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX "templates_tenant_id_idx" ON "templates" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "file_url";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "file_type";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "is_public";