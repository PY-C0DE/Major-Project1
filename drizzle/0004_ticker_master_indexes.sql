CREATE INDEX IF NOT EXISTS "ticker_master_exchange_code_idx" ON "ticker_master" USING btree ("exchange_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticker_master_name_idx" ON "ticker_master" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticker_master_active_country_exchange_idx" ON "ticker_master" USING btree ("active","country","exchange");
