ALTER TABLE "daily_sentiment" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
ALTER TABLE "daily_sentiment" ADD COLUMN IF NOT EXISTS "model_id" text DEFAULT 'keyword-lexicon-fallback' NOT NULL;
