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

## Pre-Step Hardening Fixes — TwelveData Full MIC Mapping, Verified Holiday Sources & APAC Calendar Tests
- **Full 30-MIC Twelve Data Symbol Mapping & Non-Silent Fallback**: Added complete `TWELVE_DATA_EXCHANGE_BY_MIC` (`mapTickerToTwelveDataSymbol`) coverage across all 30 exchanges in `ticker_master` (`src/server/providers/marketDataProvider.ts`). Refactored `TwelveDataMarketDataProvider` to compose `YahooFinanceMarketDataProvider` cleanly rather than masking fallback responses as `'twelvedata'` — any fallback explicitly sets `provider` to the actual backend source, records `fallbackFrom: 'twelvedata'`, attaches a visible `warning` / `providerWarning` + `X-Data-Fallback-From`/`X-Provider-Warning` HTTP headers (`server.ts`, `evaluation.ts`, `auditExport.ts`, `runAudit.ts`), and logs a `console.warn`.
- **Verified Exchange Holiday Sources & Missing-Year Guard (`2026-11-24`)**: Replaced hand-typed global holiday tables in `src/server/math/exchangeCalendar.ts` with `date-holidays@^3.39.2` paired with official exchange trading-schedule rules and documented retrieval metadata (`HOLIDAY_DATA_RETRIEVED_AT = '2026-11-24'`). Requests for unsupported MICs or years outside verified bounds throw `MissingExchangeHolidayDataError`.
- **Exchange Calendar Source Ledger (Retrieved `2026-11-24`)**:

| Exchange MICs | Country / Subdivision | Coverage Window | Primary Source & Exchange Rule Alignment | Retrieved At |
| :--- | :--- | :--- | :--- | :--- |
| `XNSE`, `XBOM` | `IN` (`MH`) | `2024–2026` | `date-holidays (IN-MH)` + NSE India / BSE India Capital Market Holiday Circulars | `2026-11-24` |
| `XNYS`, `XNAS` | `US` | `2020–2026` | `date-holidays (US)` filtered by NYSE Rule 7.2 & Nasdaq US Equities Schedule | `2026-11-24` |
| `XKRX`, `XKOS` | `KR` | `2024–2026` | `date-holidays (KR)` + KRX Official Market Closures (Seollal/Chuseok 3-day, May 1, Dec 31, election circulars) | `2026-11-24` |
| `XETR` | `DE` | `2020–2026` | `date-holidays (DE)` aligned to Deutsche Börse Xetra Trading Calendar (includes Dec 24 & Dec 31) | `2026-11-24` |
| `XLON`, `XPAR`, `XAMS`, `XBRU`, `XSWX`, `XMAD`, `XMIL`, `XCSE`, `XSTO`, `XHEL`, `XOSL` | `GB-ENG`, `FR`, `NL`, `BE`, `CH`, `ES`, `IT`, `DK`, `SE`, `FI`, `NO` | `2020–2026` | `date-holidays` per-jurisdiction calendars aligned to LSE / Euronext / SIX / BME / Nordic exchange rules | `2026-11-24` |
| `XTKS` | `JP` | `2020–2026` | `date-holidays (JP)` + JPX Tokyo Stock Exchange statutory closures (`Jan 2–3`, `Dec 31`) | `2026-11-24` |
| `XHKG` | `HK` | `2020–2026` | `date-holidays (HK)` General Holidays aligned to HKEX Securities Market Calendar | `2026-11-24` |
| `XSHG`, `XSHE`, `XTAI`, `XIDX` | `CN`, `TW`, `ID` | `2024–2026` | `date-holidays` official statutory holidays aligned to SSE / SZSE / TWSE / IDX trading windows | `2026-11-24` |
| `XTSE`, `XASX`, `XSES`, `BVMF`, `XJSE`, `XMEX` | `CA-ON`, `AU-NSW`, `SG`, `BR`, `ZA`, `MX` | `2020–2026` | `date-holidays` aligned to TMX TSX, ASX, SGX, B3, JSE, and BMV equity schedules | `2026-11-24` |

- **Additional Exchange Calendar Tests**: Added explicit unit tests for Tokyo (`XTKS`, `Asia/Tokyo`, `7203.T`, Golden Week & JPX statutory dates) and Hong Kong (`XHKG`, `Asia/Hong_Kong`, `0700.HK`, HKSAR Day & Lunar New Year) in `tests/step3And4.test.ts`.

## STEP 5 — Multilingual News Detection & FinBERT Language Guard
- Added `src/server/math/languageDetection.ts` (`detectTextLanguage`) detecting Unicode script families and Latin stopwords/diacritics across `en`, `ko`, `ja`, `zh`, `hi`, `de`, `fr`, `es`, `pt`, `it`, `nl`, `sv`, `no`, `da`, `fi`, `id`, `ru`, and `ar`.
- Updated `src/server/math/finbertSentiment.ts` to strictly gate English FinBERT (`Xenova/finbert`): non-English headlines NEVER invoke FinBERT inference and are scored exclusively via `analyzeMultilingualLexiconSentiment` (`sentimentSource: 'multilingual-lexicon'`, `modelId: 'multilingual-lexicon-v1'`).
- Added `language` and `model_id` columns to `daily_sentiment` (`src/db/schema.ts`, `drizzle/0001_step5_multilingual_sentiment.sql`) and propagated `language` / `modelId` across `PostgresRepository`, `InMemoryRepository`, `nlpEngine.ts`, `exchangeCalendar.ts`, API payloads, and UI badges (`NewsPage.tsx`, `DashboardPage.tsx`, `SentimentCard.tsx`, `RealTimeNewsPulse.tsx`, `DailyMarketDigest.tsx`, `NewsTicker.tsx`).

## STEP 6 — Production Hardening, Operational Probes & Background Job Queue
- Added `helmet` HTTP security headers (with iframe/Vite compatibility), `x-powered-by` suppression, and strict `cors` origin allowlist checking (`resolveCorsOriginAllowed`, rejecting disallowed origins with JSON HTTP 403) in `server.ts`.
- Upgraded rate limiting with `express-rate-limit` across `/api/*`, credential auth endpoints, and heavy compute endpoints (`/api/model/audit`, `POST /api/jobs`), plus `zod` schema validation (`src/server/middleware/validation.ts`) returning structured HTTP 400 validation errors.
- Added structured JSON request/event logging with `X-Request-Id` correlation (`src/server/middleware/logger.ts`), operational Kubernetes/Cloud Run probes (`GET /healthz` and DB-checked `GET /readyz`), and an async `BackgroundJobQueue` (`src/server/jobs/jobQueue.ts`) backing `POST /api/jobs`, `GET /api/jobs`, and `GET /api/jobs/:id` for `audit`, `backfill`, and `refit` workloads.


