ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "daily_sentiment" ADD COLUMN IF NOT EXISTS "model_version" text DEFAULT '1.0.0' NOT NULL;
