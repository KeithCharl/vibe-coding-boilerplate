-- Agent system tables migration
CREATE TYPE "public"."agent_type" AS ENUM('knowledge_base', 'business_rules', 'testing', 'workflow', 'analytics');
CREATE TYPE "public"."agent_status" AS ENUM('active', 'inactive', 'maintenance', 'error');
CREATE TYPE "public"."agent_capability" AS ENUM('document-processing', 'data-analysis', 'rule-validation', 'test-execution', 'workflow-orchestration', 'reporting', 'nlp', 'integration');
CREATE TYPE "public"."operation_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE "public"."compliance_framework" AS ENUM('SOC2', 'GDPR', 'HIPAA', 'PCI-DSS', 'ISO-27001');

CREATE TABLE "agent_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "agent_type" NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"description" text NOT NULL,
	"base_route" varchar(100) NOT NULL,
	"api_endpoint" varchar(255),
	"health_check_endpoint" varchar(255),
	"capabilities" agent_capability[] DEFAULT '{}' NOT NULL,
	"dependencies" text[] DEFAULT '{}',
	"interface_schema" jsonb,
	"default_config" jsonb DEFAULT '{}' NOT NULL,
	"resource_limits" jsonb,
	"security_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"is_core" boolean DEFAULT false,
	"maintenance_mode" boolean DEFAULT false,
	"compliance_frameworks" compliance_framework[] DEFAULT '{}',
	"audit_level" varchar(20) DEFAULT 'standard' NOT NULL,
	"data_retention_days" integer DEFAULT 365,
	"icon" varchar(50) DEFAULT 'Bot',
	"color" varchar(20) DEFAULT 'blue',
	"tags" text[] DEFAULT '{}',
	"documentation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

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
	"timestamp" timestamp DEFAULT now() NOT NULL
);

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
	"timestamp" timestamp DEFAULT now() NOT NULL
);

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
	"timestamp" timestamp DEFAULT now() NOT NULL
);

-- Foreign key constraints
ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tenant_agent_configs" ADD CONSTRAINT "tenant_agent_configs_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agent_health_metrics" ADD CONSTRAINT "agent_health_metrics_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agent_health_metrics" ADD CONSTRAINT "agent_health_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_source_agent_id_agent_registry_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_target_agent_id_agent_registry_id_fk" FOREIGN KEY ("target_agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agent_communication_log" ADD CONSTRAINT "agent_communication_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_agent_id_agent_registry_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_registry"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "agent_security_events" ADD CONSTRAINT "agent_security_events_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

-- Indexes for performance
CREATE INDEX "agent_registry_type_idx" ON "agent_registry" USING btree ("type");
CREATE INDEX "agent_registry_status_idx" ON "agent_registry" USING btree ("status");
CREATE INDEX "agent_registry_is_core_idx" ON "agent_registry" USING btree ("is_core");
CREATE INDEX "agent_registry_security_level_idx" ON "agent_registry" USING btree ("security_level");
CREATE INDEX "tenant_agents_tenant_id_idx" ON "tenant_agent_configs" USING btree ("tenant_id");
CREATE INDEX "tenant_agents_agent_id_idx" ON "tenant_agent_configs" USING btree ("agent_id");
CREATE INDEX "tenant_agents_is_enabled_idx" ON "tenant_agent_configs" USING btree ("is_enabled");
CREATE INDEX "tenant_agents_unique" ON "tenant_agent_configs" USING btree ("tenant_id", "agent_id");
CREATE INDEX "agent_health_agent_id_idx" ON "agent_health_metrics" USING btree ("agent_id");
CREATE INDEX "agent_health_tenant_id_idx" ON "agent_health_metrics" USING btree ("tenant_id");
CREATE INDEX "agent_health_status_idx" ON "agent_health_metrics" USING btree ("status");
CREATE INDEX "agent_health_timestamp_idx" ON "agent_health_metrics" USING btree ("timestamp");
CREATE INDEX "agent_comm_source_idx" ON "agent_communication_log" USING btree ("source_agent_id");
CREATE INDEX "agent_comm_target_idx" ON "agent_communication_log" USING btree ("target_agent_id");
CREATE INDEX "agent_comm_tenant_idx" ON "agent_communication_log" USING btree ("tenant_id");
CREATE INDEX "agent_comm_user_idx" ON "agent_communication_log" USING btree ("user_id");
CREATE INDEX "agent_comm_operation_idx" ON "agent_communication_log" USING btree ("operation_type");
CREATE INDEX "agent_comm_status_idx" ON "agent_communication_log" USING btree ("status");
CREATE INDEX "agent_comm_timestamp_idx" ON "agent_communication_log" USING btree ("timestamp");
CREATE INDEX "agent_security_agent_id_idx" ON "agent_security_events" USING btree ("agent_id");
CREATE INDEX "agent_security_tenant_id_idx" ON "agent_security_events" USING btree ("tenant_id");
CREATE INDEX "agent_security_event_type_idx" ON "agent_security_events" USING btree ("event_type");
CREATE INDEX "agent_security_severity_idx" ON "agent_security_events" USING btree ("severity");
CREATE INDEX "agent_security_resolved_idx" ON "agent_security_events" USING btree ("resolved");
CREATE INDEX "agent_security_timestamp_idx" ON "agent_security_events" USING btree ("timestamp");