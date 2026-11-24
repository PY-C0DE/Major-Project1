CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"type" text NOT NULL,
	"threshold" double precision,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "daily_sentiment" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"date" text NOT NULL,
	"credibility_weighted_net_score" double precision NOT NULL,
	"article_count" integer NOT NULL,
	"sentiment_source" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"company_name" text NOT NULL,
	"quantity" double precision NOT NULL,
	"avg_buy_price" double precision NOT NULL,
	"current_price" double precision NOT NULL,
	"total_invested" double precision NOT NULL,
	"current_value" double precision NOT NULL,
	"pnl" double precision NOT NULL,
	"pnl_percent" double precision NOT NULL,
	"purchase_date" text NOT NULL,
	"sector" text,
	"currency" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"predicted_price" double precision NOT NULL,
	"current_price" double precision NOT NULL,
	"lower_bound" double precision NOT NULL,
	"upper_bound" double precision NOT NULL,
	"confidence_level" double precision NOT NULL,
	"market_regime" text NOT NULL,
	"sentiment_score" double precision NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticker_master" (
	"symbol" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"exchange" text NOT NULL,
	"exchange_code" text NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"timezone" text NOT NULL,
	"asset_type" text DEFAULT 'EQUITY' NOT NULL,
	"sector" text DEFAULT 'Equities' NOT NULL,
	"pe" double precision,
	"market_cap" double precision,
	"base_price" double precision,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" text NOT NULL,
	"is_demo_user" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"title" text,
	"organization" text,
	"phone" text,
	"bio" text,
	"timezone" text,
	"currency_preference" text DEFAULT 'INR',
	"default_exchange" text DEFAULT 'NSE',
	"confidence_level" integer DEFAULT 90,
	"two_factor_enabled" boolean DEFAULT false,
	"notifications" jsonb,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_user_id_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_sentiment_ticker_date_uq" ON "daily_sentiment" USING btree ("ticker","date");--> statement-breakpoint
CREATE INDEX "daily_sentiment_date_idx" ON "daily_sentiment" USING btree ("date");--> statement-breakpoint
CREATE INDEX "portfolios_user_id_idx" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prediction_history_user_id_idx" ON "prediction_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prediction_history_ticker_idx" ON "prediction_history" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "ticker_master_country_idx" ON "ticker_master" USING btree ("country");--> statement-breakpoint
CREATE INDEX "ticker_master_exchange_idx" ON "ticker_master" USING btree ("exchange");--> statement-breakpoint
CREATE INDEX "ticker_master_active_idx" ON "ticker_master" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlists_user_ticker_uq" ON "watchlists" USING btree ("user_id","ticker");--> statement-breakpoint
CREATE INDEX "watchlists_user_id_idx" ON "watchlists" USING btree ("user_id");