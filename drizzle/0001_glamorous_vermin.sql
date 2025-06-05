CREATE TABLE "chat_session_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_session_personas" ADD CONSTRAINT "chat_session_personas_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session_personas" ADD CONSTRAINT "chat_session_personas_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_session_personas_session_id_idx" ON "chat_session_personas" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_session_personas_persona_id_idx" ON "chat_session_personas" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "personas_tenant_id_idx" ON "personas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "personas_created_by_idx" ON "personas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "personas_is_active_idx" ON "personas" USING btree ("is_active");