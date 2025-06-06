ALTER TABLE "chat_sessions" ADD COLUMN "is_bookmarked" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "chat_sessions_is_bookmarked_idx" ON "chat_sessions" USING btree ("is_bookmarked");