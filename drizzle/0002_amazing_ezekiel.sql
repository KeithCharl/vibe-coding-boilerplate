CREATE TABLE "web_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"embedding" text,
	"status" varchar(50) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"analyzed_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "web_analysis" ADD CONSTRAINT "web_analysis_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_analysis" ADD CONSTRAINT "web_analysis_analyzed_by_user_id_fk" FOREIGN KEY ("analyzed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_analysis_tenant_id_idx" ON "web_analysis" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "web_analysis_url_idx" ON "web_analysis" USING btree ("url");--> statement-breakpoint
CREATE INDEX "web_analysis_analyzed_by_idx" ON "web_analysis" USING btree ("analyzed_by");--> statement-breakpoint
CREATE INDEX "web_analysis_status_idx" ON "web_analysis" USING btree ("status");--> statement-breakpoint
CREATE INDEX "web_analysis_created_at_idx" ON "web_analysis" USING btree ("created_at");