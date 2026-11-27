# AlphaQuant AI — Load & Concurrency Benchmark Report

- **Measured At (UTC):** `2026-11-27T11:22:25.224Z`
- **Generator Command:** `npx tsx scripts/loadTest.ts --write-report`
- **Repository Backend:** `PostgresRepository`
- **Runtime:** Node `v22.23.5` | CPU: `unknown` (2 cores) | RAM: `4.0 GB`
- **Stage Duration:** 4s per tier for light/auth endpoints, 12s for CPU-bound `/api/predictions/NVDA` (`c = 1, 10, 25, 50`)
- **Test Conditions:** Loopback Express HTTP server with `createApp(...)`, rate limits raised for throughput measurement (rate-limit enforcement verified separately in `tests/security.test.ts`), and local deterministic OHLCV/news fixture provider (`MarketDataProvider`) so external Yahoo network throttling does not distort Express/DB/conformal timings.

## Measured Throughput & Latency Distribution

| Endpoint | Connections | Dur (s) | Total Req | RPS (avg) | p50 (ms) | p95 (ms) | p97.5 (ms) | p99 (ms) | Max (ms) | Errors | Non-2xx |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `GET /api/tickers/search?q=RELIANCE&limit=24` | 1 | 4 | 26 | 6.5 | 150.00 | 156.34 | 160.00 | 160.00 | 160.00 | 0 | 0 |
| `GET /api/tickers/search?q=RELIANCE&limit=24` | 10 | 4 | 228 | 57.0 | 157.00 | 182.96 | 527.00 | 553.00 | 591.00 | 0 | 0 |
| `GET /api/tickers/search?q=RELIANCE&limit=24` | 25 | 4 | 250 | 62.5 | 382.00 | 418.42 | 428.00 | 467.00 | 470.00 | 0 | 0 |
| `GET /api/tickers/search?q=RELIANCE&limit=24` | 50 | 4 | 208 | 52.0 | 798.00 | 1006.57 | 1031.00 | 1043.00 | 1056.00 | 0 | 0 |
| `POST /api/auth/login` | 1 | 4 | 23 | 5.8 | 179.00 | 203.95 | 212.00 | 212.00 | 212.00 | 0 | 0 |
| `POST /api/auth/login` | 10 | 4 | 20 | 6.7 | 1531.00 | 1533.10 | 1537.00 | 1537.00 | 1537.00 | 0 | 0 |
| `POST /api/auth/login` | 25 | 4 | 25 | 8.3 | 4143.00 | 4321.25 | 4321.00 | 4321.00 | 4321.00 | 0 | 0 |
| `POST /api/auth/login` | 50 | 4 | 8 | 2.0 | 3488.00 | 4410.46 | 4410.00 | 4410.00 | 4410.00 | 0 | 0 |
| `GET /api/jobs` | 1 | 4 | 0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 |
| `GET /api/jobs` | 10 | 4 | 552 | 138.0 | 51.00 | 88.96 | 104.00 | 1133.00 | 1141.00 | 0 | 0 |
| `GET /api/jobs` | 25 | 4 | 819 | 204.8 | 120.00 | 138.46 | 142.00 | 146.00 | 185.00 | 0 | 0 |
| `GET /api/jobs` | 50 | 4 | 757 | 189.3 | 247.00 | 302.98 | 369.00 | 414.00 | 435.00 | 0 | 0 |
| `GET /api/predictions/NVDA` | 1 | 12 | 32 | 2.9 | 399.00 | 527.95 | 758.00 | 758.00 | 758.00 | 0 | 0 |
| `GET /api/predictions/NVDA` | 10 | 12 | 42 | 7.0 | 3252.00 | 4155.98 | 4156.00 | 5821.00 | 5821.00 | 0 | 0 |
| `GET /api/predictions/NVDA` | 25 | 12 | 45 | 7.5 | 7252.00 | 9599.31 | 9599.00 | 9600.00 | 9600.00 | 0 | 0 |
| `GET /api/predictions/NVDA` | 50 | 12 | 15 | 1.9 | 7318.00 | 12708.74 | 12708.00 | 12708.00 | 12708.00 | 0 | 0 |

## Bottleneck Analysis & Capacity Observations

- **`GET /api/tickers/search?q=RELIANCE&limit=24`**: Peak average throughput 62.5 RPS; latency scales from `p50=150.00ms / p95=156.34ms` at `c=1` to `p50=798.00ms / p95=1006.57ms / p99=1043.00ms` at `c=50` (errors: 0, non-2xx: 0).
- **`POST /api/auth/login`**: Peak average throughput 8.3 RPS; latency scales from `p50=179.00ms / p95=203.95ms` at `c=1` to `p50=3488.00ms / p95=4410.46ms / p99=4410.00ms` at `c=50` (errors: 0, non-2xx: 0).
- **`GET /api/jobs`**: Peak average throughput 204.8 RPS; latency scales from `p50=0.00ms / p95=0.00ms` at `c=1` to `p50=247.00ms / p95=302.98ms / p99=414.00ms` at `c=50` (errors: 0, non-2xx: 0).
- **`GET /api/predictions/NVDA`**: Peak average throughput 7.5 RPS; latency scales from `p50=399.00ms / p95=527.95ms` at `c=1` to `p50=7318.00ms / p95=12708.74ms / p99=12708.00ms` at `c=50` (errors: 0, non-2xx: 0).

### Key Architectural Bottlenecks
1. **`POST /api/auth/login` (bcrypt + DB lookup):** Intentionally CPU-bound via salted `bcryptjs` password verification (cost factor 10). Under high concurrency (`c=25–50`), event-loop/thread-pool hashing caps throughput and raises tail latency, which aligns cleanly with the production `5 req/min` credential rate limiter (`authCredentialLimiter`).
2. **`GET /api/predictions/:ticker` (Synchronous Conformal & Ensemble Training):** Fits the 4-learner AlphaQuant ensemble + split-conformal calibration windows synchronously on the Node event loop per request. Heavy horizontal traffic should front this route with worker threads or short-TTL response caching keyed by latest market bar timestamp.
3. **`GET /api/tickers/search` (Indexed `ticker_master` Queries):** Leverages PostgreSQL indexes (`ticker_master_active_country_exchange_idx`, `ticker_master_name_idx`, `ticker_master_exchange_code_idx`) with SQL `LIMIT/OFFSET` pagination across active equities.
4. **`GET /api/jobs` (JWT Auth + Queue Snapshot):** Lightweight HMAC-SHA256 verification + user lookup; scales with Postgres connection pool size (with Redis connection latency when `JOB_QUEUE_BACKEND=bullmq`).

## Honest Scope & Limitations
- These numbers reflect single-process loopback Express + active repository behavior under a deterministic local OHLCV fixture provider; live Yahoo Finance / Twelve Data upstream network variance, FinBERT cold ONNX model loading on uncached multilingual/English headlines, and multi-region Cloud SQL round-trip RTT vary with external network conditions.
- Default production rate limits (`authCredentialLimiter: 5/min`, `heavyJobRateLimiter: 20/min`, `apiRateLimiter: 300/min`) were raised inside this benchmark harness strictly to measure unthrottled endpoint saturation behavior.
