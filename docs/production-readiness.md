# AlphaQuant AI — Production Readiness & Operations Runbook

This runbook documents production deployment requirements, environment variables, secrets management, PostgreSQL backup/restore verification, monitoring thresholds, and incident response procedures for **AlphaQuant AI** (`server.ts` + PostgreSQL/Cloud SQL + BullMQ/Redis + React/Vite).

---

## 1. Environment Variable Inventory

All secrets are supplied strictly via environment variables or Secret Manager — never committed in source control (`.env*` is gitignored; `.env.example` contains placeholders only).

### Core Server, Security & Fail-Closed Guards
| Variable | Required in Production | Default | Purpose & Failure Behavior |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** (`production`) | `development` | Enables fail-closed checks for `JWT_SECRET`, PostgreSQL (`SQL_*`), and durable BullMQ job queue. |
| `PORT` | No | `3000` | Express HTTP listener port. |
| `JWT_SECRET` | **Yes** (`>= 32` chars) | Ephemeral (dev only) | HMAC-SHA256 JWT signing secret (`openssl rand -hex 32`). Server **throws at boot** if missing, `< 32` chars, or set to the legacy placeholder in production. |
| `CORS_ALLOWED_ORIGINS` | **Yes** | `http://localhost:3000,http://127.0.0.1:3000,https://aistudio.google.com` | Comma-separated exact allowed origins (`resolveCorsOriginAllowed`). Never `*`; unknown `Origin` headers receive HTTP `403` JSON. |
| `ALLOW_DEMO_MODE` | **Must be `false`** | `false` | Allows unauthenticated requests to fall back to the demo user when `true`. Keep `false` in production. |
| `VITE_DEMO_MODE` | **Must be `false`** | `false` | Client-side demo-session toggle baked at `npm run build` time. Keep `false` in production. |
| `APP_BASE_URL` / `FRONTEND_URL` / `BACKEND_URL` | **Yes** | `http://localhost:3000` | External canonical URL used when generating email verification and password reset links. |

### PostgreSQL / Cloud SQL Persistence
| Variable | Required in Production | Default | Purpose & Failure Behavior |
| :--- | :--- | :--- | :--- |
| `SQL_HOST` | **Yes** | `127.0.0.1` | Cloud SQL Auth Proxy socket path (e.g. `/cloudsql/PROJECT:asia-southeast1:INSTANCE`) or Postgres hostname/IP. App **fails closed** in production if missing (`createDefaultRepository`). |
| `SQL_PORT` | No | `5432` | TCP port (ignored for AF_UNIX socket hosts). |
| `SQL_USER` | **Yes** | Unset | PostgreSQL application role (`alphaquant`). |
| `SQL_PASSWORD` | **Yes** | Unset | PostgreSQL application role password. |
| `SQL_DB_NAME` | **Yes** | `alphaquant` | Target PostgreSQL database name. |
| `SQL_SSL` | Conditional | Auto (`true` for remote TCP, `false` for localhost/Unix socket) | Forces TLS (`true`/`require`) or disables TLS (`false`/`disable`). Remote TCP verifies certs (`rejectUnauthorized: true`) by default. |
| `SQL_SSL_CA` | Conditional | Unset | PEM path or inline CA certificate for custom/Cloud SQL server CA verification. |
| `SQL_SSL_REJECT_UNAUTHORIZED` | No (`true`) | `true` | Setting `false` disables certificate verification and logs a security warning; keep `true` in production. |

### Durable Job Queue (`BullMQ` + `Redis`)
| Variable | Required in Production | Default | Purpose & Failure Behavior |
| :--- | :--- | :--- | :--- |
| `JOB_QUEUE_BACKEND` | **Yes** (`bullmq`) | `in-memory` (dev only) | Selects `BullMQJobQueue` (`bullmq`) vs `BackgroundJobQueue` (`in-memory`). |
| `REDIS_URL` | **Yes** (unless override) | Unset | Redis connection string (`redis://...` or `rediss://...`). Production **fails closed** on startup without `REDIS_URL` unless `ALLOW_IN_PROCESS_JOB_QUEUE=true`. |
| `JOB_MAX_ATTEMPTS` | No | `3` | Retry ceiling per job with exponential backoff. |
| `JOB_RETRY_DELAY_MS` | No | `1000` | Initial retry backoff delay in milliseconds. |
| `ALLOW_IN_PROCESS_JOB_QUEUE` | No (`false`) | `false` | Emergency-only bypass allowing volatile in-memory queue in production (never recommended). |

### Transactional Email (Verification & Password Reset)
| Variable | Required for Mail Flows | Default | Purpose & Failure Behavior |
| :--- | :--- | :--- | :--- |
| `MAIL_FROM` | **Yes** (for email auth) | Unset | Verified sender identity (e.g. `AlphaQuant AI <no-reply@example.com>`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Either SMTP or Resend | Unset | Nodemailer SMTP transport configuration (`587` STARTTLS or `465` TLS). |
| `RESEND_API_KEY` | Either SMTP or Resend | Unset | Resend HTTPS mail transport API key. If neither SMTP nor Resend is configured, mail endpoints return explicit HTTP `503`. |

### Market Data, AI & Compliance
| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `MARKET_DATA_PROVIDER` | No | `yahoo` | Selects `yahoo` (`YahooFinanceMarketDataProvider`) or `twelvedata` (`TwelveDataMarketDataProvider`). Logged in `audit.json` & `/readyz`. |
| `TWELVE_DATA_API_KEY` | Conditional | Unset | Commercial Twelve Data API key when `MARKET_DATA_PROVIDER=twelvedata`. |
| `GEMINI_API_KEY` | Optional | Unset | Optional Gemini key for `/api/support/chat` & `/api/copilot/chat` (rule-based fallback stays active if unset). |
| `COMPLIANCE_DISCLAIMER_TEXT` | Recommended | Built-in notice | Research/non-advice banner served at `/api/compliance/config`. |
| `COMPLIANCE_OPERATOR_LEGAL_ENTITY` / `COMPLIANCE_OPERATOR_NAME` | **Yes (before public launch)** | `[OPERATOR_LEGAL_ENTITY]` | Legal operator name surfaced on `/legal` Terms & Privacy pages. |
| `COMPLIANCE_OPERATOR_ADDRESS`, `COMPLIANCE_OPERATOR_CONTACT_EMAIL`, `COMPLIANCE_DPO_EMAIL`, `COMPLIANCE_JURISDICTION` | **Yes (before public launch)** | Bracket placeholders | Legal notice, privacy contact, DPO, and governing jurisdiction values. |

### Client-Side Firebase Config (Optional Google Sign-In)
| Variable | Purpose |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | Public client Firebase SDK parameters baked at Vite build time (`src/lib/firebase.ts`). ID tokens are held in JS memory only (`indexedDB` / `localStorage` never store JWTs on custom backend). |

---

## 2. Secrets Rotation Runbook

1. **Rotating `JWT_SECRET`**
   - *Impact*: All existing stateless HMAC-SHA256 JWT sessions are immediately invalidated (users must sign in again; stored `bcrypt` hashes and `token_version` rows remain intact).
   - *Procedure*:
     1. Generate a fresh 256-bit secret: `openssl rand -hex 32`.
     2. Update secret manager / Cloud Run revision env `JWT_SECRET`.
     3. Deploy rolling revision and confirm `GET /readyz` returns `200`.
     4. For targeted individual session revocation without global rotation, increment `users.token_version` or execute `DELETE /api/account` (`resolveTokenUser` rejects mismatched versions with `401`).
2. **Rotating PostgreSQL / Cloud SQL Credentials (`SQL_PASSWORD`)**
   - *Procedure*:
     1. Create a secondary Cloud SQL role or set a dual-password grace transition via Cloud SQL Admin (`gcloud sql users set-password`).
     2. Update `SQL_PASSWORD` in secret manager, roll Cloud Run / container instances, verify `GET /readyz` reports `"database": "ok"`.
     3. Retire old password/role.
3. **Rotating Market Data & Mail Keys (`TWELVE_DATA_API_KEY`, `RESEND_API_KEY`, `SMTP_PASS`, `GEMINI_API_KEY`)**
   - Generate replacement key in vendor console, update container secret revision, restart workers/server, test `POST /api/auth/forgot-password` (or `GET /api/stocks/AAPL`) cleanly, then revoke previous vendor key.

---

## 3. PostgreSQL Backup & Restore Verification Procedure

The persistent tables (`users`, `portfolios`, `watchlists`, `alerts`, `prediction_history`, `daily_sentiment`, `ticker_master`, `auth_tokens`) live in PostgreSQL (Cloud SQL in `asia-southeast1` or `postgres:16-alpine` via `docker-compose.yml`).

### Automated Cloud SQL Backups & PITR
- Ensure Cloud SQL automated daily backups and **Point-in-Time Recovery (PITR / write-ahead log archiving >= 7 days)** are enabled on the primary instance in `asia-southeast1`.

### Manual Pre-Migration Snapshot & Monthly Restore Drill
```bash
# 1. Take a consistent logical custom-format snapshot before major schema changes or drills
PGPASSWORD="$SQL_PASSWORD" pg_dump \
  --host="$SQL_HOST" --port="${SQL_PORT:-5432}" \
  --username="$SQL_USER" --dbname="$SQL_DB_NAME" \
  --format=custom --no-owner --no-acl \
  --file="alphaquant-backup-$(date -u +%Y%m%dT%H%M%SZ).dump"

# 2. Restore into an isolated staging/verification database (never overwrite production directly)
PGPASSWORD="$SQL_PASSWORD" pg_restore \
  --host="$VERIFY_SQL_HOST" --port="${VERIFY_SQL_PORT:-5432}" \
  --username="$SQL_USER" --dbname="$VERIFY_SQL_DB" \
  --clean --if-exists --no-owner --no-acl \
  alphaquant-backup-YYYYMMDDTHHMMSSZ.dump

# 3. Verify row counts & schema integrity against Drizzle migrations
psql "$VERIFY_DATABASE_URL" -c "SELECT count(*) AS active_tickers FROM ticker_master WHERE active = true;"
```
- Record monthly restore drill completion date, recovery time objective (RTO), and row-count diff in internal ops logs.

---

## 4. Monitoring, Probes & Alerting Thresholds

### Built-In Operational Endpoints
| Endpoint | Purpose | Success Criteria |
| :--- | :--- | :--- |
| `GET /healthz` | Process liveness probe (exempt from `/api` rate limits) | HTTP `200`, JSON `{"status":"ok","uptimeSec":...}` |
| `GET /readyz` | Dependency readiness probe (`db.searchTickers` + `jobQueue.ping`) | HTTP `200`, JSON `{"status":"ready","checks":{"database":"ok","provider":...,"queue":...}}`; returns `503` when DB or Redis queue is unreachable |
| `GET /api/jobs/failed` | Dead-letter / exhausted background jobs inspector (JWT protected) | Inspect `count` and per-job `failedReason`; trigger `POST /api/jobs/:id/retry` after root-cause recovery |

### Alerting Thresholds
| Signal | Warning Threshold | Critical / Page Threshold | Action |
| :--- | :--- | :--- | :--- |
| `/readyz` non-200 rate | Any 2 consecutive failures (`> 30s`) | `>= 3` failures (`> 60s`) | Remove instance from load balancer; inspect Cloud SQL / Redis connectivity. |
| HTTP `5xx` error ratio | `> 0.5%` over 5m | `> 2.0%` over 5m | Inspect structured JSON stdout logs (`requestId`, `event`) for unhandled upstream errors. |
| API latency (`p95`) | `> 500 ms` on `/api/tickers/search` or `/api/jobs` | `> 1,500 ms` sustained 5m | Check Postgres slow queries/indexes (`pg_stat_statements`), event-loop saturation on `/api/predictions/:ticker`. |
| BullMQ `failed` jobs | `count >= 1` on `audit` or `ticker_refresh` | `count >= 5` or growing backlog | Query `GET /api/jobs/failed`, inspect upstream provider errors, replay via `POST /api/jobs/:id/retry`. |
| Auth `429` burst | `> 30 req/min` across IP range | Sustained brute-force surge | Review edge WAF/CDN rules; credential endpoints already cap `5 req/min/IP`. |

---

## 5. Outage & Degradation Runbooks

1. **Upstream Market Data Outage (Yahoo Finance / Twelve Data)**
   - `/api/model/audit`, `/api/model/metrics`, `/api/stocks/search`, and `/api/news` fail closed with explicit `unavailable` / `503` payloads (never substituting synthetic data into model audits).
   - If using `MARKET_DATA_PROVIDER=twelvedata` and fallback triggers, responses emit `fallbackFrom: 'twelvedata'`, `X-Data-Fallback-From: twelvedata`, and structured `console.warn` entries.
   - Verify whether commercial Twelve Data quota was exhausted (`https://api.twelvedata.com/api_usage`) or upstream DNS/egress is blocked.
2. **Redis Outage (BullMQ Queue)**
   - `/readyz` transitions to HTTP `503` (`"queue": "unavailable"`). Existing synchronous forecast/search routes continue serving reads, while `POST /api/jobs` fails rather than silently losing scheduled jobs in memory. Restore Redis AOF volume (`redis_data`) and inspect `GET /api/jobs/failed`.
3. **Cloud SQL Connection Exhaustion**
   - Pool max is `10` per Node process (`src/db/index.ts`) with `connectionTimeoutMillis: 15000`. Scale horizontally within Cloud SQL `max_connections` headroom or place PgBouncer / Cloud SQL Auth Proxy connection pooling in front of replicas.
