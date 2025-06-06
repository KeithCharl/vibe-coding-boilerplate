CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"category" varchar(100) DEFAULT 'general',
	"tags" text[],
	"is_public" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompts_tenant_id_idx" ON "prompts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prompts_created_by_idx" ON "prompts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "prompts_category_idx" ON "prompts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "prompts_is_public_idx" ON "prompts" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "prompts_is_active_idx" ON "prompts" USING btree ("is_active");