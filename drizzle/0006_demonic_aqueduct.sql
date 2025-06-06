CREATE TYPE "public"."global_role" AS ENUM('super_admin', 'tenant_admin', 'user');--> statement-breakpoint
CREATE TABLE "global_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "global_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "global_user_roles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performed_by" varchar(255) NOT NULL,
	"target_user_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "global_user_roles" ADD CONSTRAINT "global_user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "global_user_roles_user_id_idx" ON "global_user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_audit_log_performed_by_idx" ON "user_audit_log" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "user_audit_log_target_user_idx" ON "user_audit_log" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "user_audit_log_action_idx" ON "user_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_audit_log_created_at_idx" ON "user_audit_log" USING btree ("created_at");