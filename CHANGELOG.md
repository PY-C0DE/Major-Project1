# Changelog

## STEP 0 — Repo Hygiene & Diagnostic Copy Accuracy
- Added `data/*` (with `!data/alphaquant_store.example.json` exception) to `.gitignore` so runtime stores containing user credentials or PII are never tracked. *(Note: no `.git` metadata directory is present in this workspace container, so `git rm --cached` was not applicable locally.)*
- Added sanitized `data/alphaquant_store.example.json` containing empty store collections with zero user credentials or personal information.
- Updated `src/server/store/db.ts` (`loadFromDisk`) to deterministically initialize a fresh store file on disk when missing.
- Updated `src/server/math/nlpEngine.ts`, `src/server/services/copilotKnowledge.ts`, and `src/pages/LandingPage.tsx` to remove inaccurate claims that news events or KS drift automatically widen split-conformal intervals.

## STEP 1 — PostgreSQL + Drizzle ORM Persistence & Firebase Auth
- Added Drizzle PostgreSQL schema (`src/db/schema.ts`), checked-in SQL migrations (`drizzle/0000_chief_argent.sql`), and Cloud SQL connection pool (`src/db/index.ts`) using `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME`.
- Refactored `src/server/store/db.ts` behind a pluggable async `DatabaseRepository` (`PostgresRepository` for PostgreSQL/Cloud SQL and `InMemoryRepository` for tests). Added fail-closed enforcement in `NODE_ENV=production` when PostgreSQL credentials are absent.
- Added Firebase Auth (Google Sign-In) client/admin integration (`src/lib/firebase.ts`, `src/lib/firebase-admin.ts`, `POST /api/auth/firebase`, `AuthContext.tsx`, `AuthModal.tsx`) keeping Firebase ID tokens in JS memory only.
- Added idempotent JSON-to-database migration script (`scripts/importJsonToDb.ts` / `npm run db:import-json`), added PostgreSQL service to `docker-compose.yml`, and documented setup in `README.md` & `.env.example`.

## STEP 2 — Global Ticker Master, Ranked Search & Multi-Currency Safety
- Added `ticker_master` PostgreSQL table (`symbol`, `name`, `exchange` MIC code, `exchange_code`, `country`, `currency`, `timezone`, `asset_type`, `sector`, `aliases`, `active`) seeded first from the 62-ticker evaluation catalog and expanded via CSV importer (`scripts/importTickers.ts` / `npm run db:import-tickers`, `scripts/seeds/global_tickers.csv`).
- Added ranked, paginated `GET /api/tickers/search?q=&country=&exchange=&page=&limit=` endpoint and wired `CompanySearchCombobox.tsx` and `MarketsPage.tsx` to query it dynamically with exchange MIC, country, and currency badges next to every ticker.
- Enforced explicit ISO 4217 currency tagging across conformal forecasts, evaluations, prediction history, portfolio holdings, and audit exports (`src/shared/auditExport.ts`). Mixed-currency aggregations (`currency = 'MIXED'`) return `null` for raw currency-denominated error totals (`MAE`, `RMSE`, `naiveMAE`, `naiveRMSE`, `ΔMAE`) while preserving scale-free metrics (`Price Accuracy`, `MAPE`, `Skill vs Naive`, `Directional Accuracy`).

## STEP 3 — MarketDataProvider Abstraction, Postgres SSL Hardening & Extended Global Ticker Seed
- Hardened PostgreSQL SSL defaults in `src/db/index.ts` (`resolvePostgresSslConfig`): TLS certificate verification (`rejectUnauthorized: true`) is now enabled by default whenever SSL is active or connecting to a remote TCP host, with optional `SQL_SSL_CA` support and an explicit opt-out (`SQL_SSL_REJECT_UNAUTHORIZED=false` or `SQL_SSL=no-verify`) that logs a security warning.
- Expanded `scripts/seeds/global_tickers.csv`, `src/utils/currency.ts`, `src/shared/tickerMetadata.ts`, and `src/utils/marketStatus.ts` with 25 equities across 12 additional global exchanges (`XKOS`, `XSHG`, `XSHE`, `XMAD`, `XMIL`, `XSTO`, `XOSL`, `XHEL`, `XBRU`, `XJSE`, `XMEX`, `XIDX`) and `MXN`/`IDR` currency symbols.
- Introduced `src/server/providers/marketDataProvider.ts` defining `MarketDataProvider` (`getHistory`, `getQuote`, `getBatchQuotes`, `getFxRate`, `getNews`, `searchTickers`) with `YahooFinanceMarketDataProvider` and `TwelveDataMarketDataProvider` (activated via `MARKET_DATA_PROVIDER=twelvedata` + `TWELVE_DATA_API_KEY`).
- Added bounded exponential backoff retries (respecting `Retry-After` and skipping non-retryable 4xx errors), concurrency/interval rate limiting, TTL caching, explicit `dataSource` (`'live' | 'synthetic' | 'unavailable'`) and `fetchedAt` stamps across quote/history/FX/news responses, and `dataProvider` / `dataProviderLicence` provenance in `audit.json` and `audit.csv`.

## STEP 4 — Exchange Calendars & Exchange-Local Date Alignment
- Added `src/server/math/exchangeCalendar.ts` supporting DST-aware timezone conversion (`Intl.DateTimeFormat`) and exchange holiday tables across 28 global MICs (including NSE/BSE, NYSE/NASDAQ, KRX/KOSDAQ, and major European, APAC, Americas, and African exchanges).
- Aligned OHLCV bar timestamps and news `publishedAt` timestamps to causal exchange-local trading sessions (`alignTimestampToTradingDate`), rolling weekend, holiday, and post-close articles forward to the next open trading session.
- Updated `src/server/math/nlpEngine.ts`, `src/server/math/lagAnalysis.ts`, and `src/server/math/evaluation.ts` to normalize sentiment records onto exchange trading calendars prior to lag correlation and walk-forward ablation, with unit tests covering NSE, NYSE, KRX, and XETR holidays and DST transitions (`tests/step3And4.test.ts`).

