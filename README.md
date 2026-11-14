# AlphaQuant AI — Global Institutional Stock Intelligence & Price Prediction Platform

> **Implementation Note (TypeScript Runtime vs. Standalone Python Directories):** The running application is implemented entirely in TypeScript (`server.ts` + `src/`). The legacy/standalone Python directories (`ml/`, `sentiment_analysis/`, `fake_news_detection/`, and `backend/`) are **not wired into or executed by** the running Node.js/React application.

A full-stack quantitative financial intelligence platform engineered for **global stock price prediction**, **split-conformal prediction intervals**, **rule-based trend/volatility regime classification**, **two-sample KS drift testing**, **multi-currency FX intelligence**, and **portfolio optimization**.

---

## 1. Primary Motive: Auditable Global Stock Price Prediction

Conventional forecasting systems output single deterministic price targets that hide volatility regimes and tail risk. **AlphaQuant AI** pairs the **AlphaQuant Ensemble (ridge + Huber gradient-boosted trees + Kalman regime filter + KNN stacker)** with **split-conformal prediction intervals**, a **rule-based trend/volatility regime classifier**, a **keyword financial-sentiment lexicon with publisher-credibility weighting**, and a **two-sample KS drift test** across global equity exchanges.

### AlphaQuant Ensemble (`src/server/math/modelEngine.ts`)
Every forecast prevents lookahead bias by fitting scalers, trees, regression weights, and meta-stacking coefficients exclusively on historical training bars prior to the target index:
1. **24-Factor Standardized Feature Vector**: Technical spreads (EMA 12/26, SMA 50), RSI-14, Bollinger %B, MACD impulse, volatility regime ratios, microstructure gap, intraday flow, linear trend quality ($\text{slope} \times R^2$), Donchian channel position, and OBV flow scaled in Garman-Klass + close-to-close blended volatility space (`estimateBarDailyVol`).
2. **Walk-Forward Huberized Ridge Regressor**: 3-fold expanding time-series cross-validation for $L_2$ regularization in volatility-normalized (Sharpe) space.
3. **Regularized Depth-2 Gradient-Boosted Decision Trees (GBDT)**: Huber loss optimization with minimum-leaf constraints.
4. **Adaptive Kalman Regime Filter**: Autocorrelation-gated trend vs. mean-reversion estimator.
5. **Cosine-Similarity Pattern Analog Forecaster (KNN)**: Regime-matched historical analog lookup in standardized feature space.
6. **Out-of-Sample Meta-Stacker & Ornstein-Uhlenbeck Propagation**: Bayesian shrinkage weighting (`shrinkageGain`) across all four base learners with multi-horizon path propagation (`1D`, `5D`, `14D`).

---

## 2. Four Core Mathematical USPs

### USP 1 — Split-Conformal Prediction Intervals (`conformal.ts`)
Provides finite-sample prediction intervals with default nominal coverage of **90%** (`DEFAULT_CONFORMAL_CONFIDENCE = 0.90` in `src/shared/modelConfig.ts`, user-adjustable across $80\%, 90\%, 95\%, 99\%$):

$$\hat{C}(X_{n+1}) = [\hat{y}_{n+1} - \hat{q}_{1-\alpha}, \; \hat{y}_{n+1} + \hat{q}_{1-\alpha}]$$

- **Distribution-Free Coverage Guarantee**: $P(Y_{n+1} \in \hat{C}(X_{n+1})) \ge 1 - \alpha$ without Gaussian return assumptions.
- **Residual Non-Conformity Calibration**: Computes quantile envelopes over chronological out-of-sample validation windows.

### USP 2 — Rule-Based Trend/Volatility Regime Classifier (`hmmRegime.ts`)
- **Rule-Based Classification**: Classifies sessions using rolling 20-day return trend vs. 10/30-day realized volatility thresholds into Bullish/Bearish Low-Volatility and High-Volatility regimes.
- **Empirical Transition Matrix & Persistence**: Tracks observed historical state transitions $P(S_t = j \mid S_{t-1} = i)$ and persistence durations, surfaced via header `RegimeIndicator` badges and regime visualizers.

### USP 3 — Keyword Financial-Sentiment Lexicon & Publisher-Credibility Weighting (`nlpEngine.ts`)
- **Keyword Financial-Sentiment Lexicon**: Scores global news headlines for bullish, neutral, and bearish polarity using a curated financial keyword lexicon (`analyzeKeywordSentiment`).
- **Publisher-Credibility Weighting**: Weights articles by verified financial publisher credibility (Reuters, Bloomberg, WSJ, Financial Times, Economic Times, Nikkei, etc.).
- **Classified Event Feed**: Categorizes catalysts (Earnings, Macro/Central Bank, M&A/Product, Analyst Actions, Regulatory) in a dedicated analytical module.

### USP 4 — Two-Sample KS Drift Test (`driftDetector.ts`)
- Compares baseline training return distributions against rolling live inference windows:

$$D_{n,m} = \sup_x |F_{1,n}(x) - F_{2,m}(x)|$$

- Raises automated alerts when distributional drift crosses significance ($p < 0.05$) and widens conformal uncertainty bands to safeguard empirical coverage during structural market breaks.

---

## 3. Global Markets, Currency & Localization Capabilities

### A. Multi-Exchange Coverage & Real-Time Market Open/Closed Status (`marketStatus.ts`, `MarketStatusBadge.tsx`)
Supports global equities across **NSE / BSE (India)**, **NASDAQ / NYSE (US)**, **KRX / KOSDAQ (South Korea)**, **TSE (Japan)**, **LSE (UK)**, **XETRA / EURONEXT (Europe)**, **HKEX (Hong Kong)**, **SSE / SZSE (China)**, **TWSE (Taiwan)**, **TSX (Canada)**, **ASX (Australia)**, and **SGX (Singapore)**.
- Every stock header, dashboard card, watchlist row, market card, and search result displays a live **Market Open / Closed Badge** (with Pre-Market, Post-Market, or Lunch Break context computed in the exchange's native IANA timezone and Yahoo trading period metadata).

### B. Native Currency Formatting & Dynamic Live FX Tooltip (`currency.ts`, `fxService.ts`, `ConvertedPrice.tsx`)
- Prices render strictly in their asset's native trading currency (`₩` KRW for `.KS/.KQ`, `₹` INR for `.NS/.BO`, `$` USD, `€` EUR, `£` GBP, `¥` JPY/CNY, `HK$`, `A$`, `C$`, `S$`, `CHF`, `NT$`, `R$`).
- Hovering or focusing any foreign-currency price opens a **theme-aware live FX tooltip** displaying the live market exchange rate, converted equivalent in the user's home currency, the explicit multiplication formula, inverse unit rate, and USD reference.

### C. Location-Aware & Selectable Live Macro Market Tape (`macroMarkets.ts`)
- Covers **17 global benchmark indices** across **8 regions**: India (`NIFTY 50`, `SENSEX`, `INDIA VIX`), United States (`S&P 500`, `NASDAQ 100`, `DOW 30`, `CBOE VIX`), Japan (`NIKKEI 225`), South Korea (`KOSPI`), Europe & UK (`FTSE 100`, `DAX 40`, `CAC 40`), Hong Kong & China (`HANG SENG`, `SSE COMP.`), Australia & Singapore (`ASX 200`, `STI INDEX`), and Canada (`S&P/TSX`).
- Supports **Auto by Location** (timezone-based regional market detection) plus a **Markets selector popover** allowing users to customize which regional tapes are pinned and streamed.

### D. 8-Language Multilingual Platform (`LanguageContext.tsx`, `LanguageDropdown.tsx`)
Full reactive internationalization across:
- **English (`en`)**, **Hindi (`hi` — हिन्दी)**, **Gujarati (`gu` — ગુજરાતી)**, **Spanish (`es` — Español)**, **French (`fr` — Français)**, **German (`de` — Deutsch)**, **Japanese (`ja` — 日本語)**, and **Chinese (`zh` — 简体中文)**.

### E. Theme-Synchronized Light & Dark Modes (`ThemeContext.tsx`)
Consistent Light and Dark theme styling across all pages, D3/Recharts visualizations, portal tooltips (`ConvertedPrice`), chart HUDs, and interactive popovers.

---

## 4. Analytical Modules & Production Workspaces

### Flagship Quantitative Modules
- **Always-Visible Valuation & 52-Week Trading Range Card**: Persistent display of 52-Week High/Low range bar, trading volume, P/E ratio, and market cap directly on `StockDetailPage`.
- **Previous-Day Stats Audit & Classified Events**: Independently toggleable diagnostic cards auditing previous close/OHLC/volume baseline numbers alongside categorized news catalysts.
- **Seasonality & Calendar Alpha Engine (`SeasonalityAnalysis.tsx`)**: Multi-year monthly return heatmap matrix, win rates, median/mean return profiles, and seasonal anomaly commentary.
- **D3 Options Volatility Surface & IV Smile Mispricing Radar (`OptionsVolatilitySurface.tsx`, `OptionsIVSmileMispricing.tsx`)**: Real-time Black-Scholes Greeks ($\Delta, \Gamma, \Theta, \nu, \rho$), 3D IV surface, ATM expected moves, and ranked rich/cheap strike mispricing arbitrage scanner.
- **Dividend Yield & Ex-Date Cashflow Calendar (`DividendCalendar.tsx`)**: Annualized income run-rates, Yield on Cost, imminent ex-dividend warnings, quarterly payout schedules, and 1–10 year DRIP compounding simulator.
- **Executive Trade Summary & Portfolio Correlation (`ExecutiveTradeSummary.tsx`, `PortfolioCorrelation.tsx`)**: Realized Sharpe Ratio, Profit Factor, cumulative closed equity curve, sector risk attribution, zoomable D3 correlation matrix with Cluster Navigator minimap, and stress testing (`PortfolioStressTest.tsx`).
- **Markowitz Mean-Variance Optimizer (`portfolioOptimizer.ts`)**: Deterministic seeded Monte Carlo simplex search (`mulberry32` seeded from sorted tickers, objective, and constraints) over a **90-trading-day lookback window** with **diagonal covariance shrinkage ($\delta = 0.2$)**, efficient frontier visualization, constrained rebalancing proposals, and CSV/JSON import/export.
- **Risk-Based & RSI Momentum Alerts (`AlertsPage.tsx`, `QuickAlertPopover.tsx`)**: Parametric VaR triggers, annualized volatility spikes, RSI-14 30/70 thresholds, price targets, and model drift alarms.
- **Automated Backtesting, Paper Broker Router & AI Copilot**: Walk-forward strategy backtester (`AutomatedBacktestingModal`), simulated paper order blotter (`BrokerRouterModal`), social copy-trade feed (`SocialCopyTradeModal`), and interactive 16-step Spotlight Tour (`ProductTourModal`).

### Application Pages (`src/pages/`)

| Page | Component | Primary Capabilities |
| :--- | :--- | :--- |
| **Landing** | `LandingPage.tsx` | Quantitative overview, mathematical sandbox, feature matrix, and 16-step tour launcher. |
| **Dashboard** | `DashboardPage.tsx` | Location-aware selectable Live Macro Market Tape, interactive candlestick forecast chart, 4 core ML cards, heatmap, and earnings calendar. |
| **Stock Detail** | `StockDetailPage.tsx` | Always-visible valuation & 52-week stats, live FX price tooltips, market Open/Closed badge, toggleable Previous-Day Audit, Classified Events, Seasonality, Options IV, and ML diagnostics. |
| **Portfolio** | `PortfolioPage.tsx` | Multi-tab workspace covering holdings ledger, trade blotter, equity performance, correlation matrix, stress tests, Markowitz Efficient Frontier, dividends, and tax/fee estimation. |
| **Markets & Correlation** | `MarketsPage.tsx` | Global sector heatmap, cross-asset Pearson correlation explorer, and live index breadth with Open/Closed exchange status badges. |
| **Watchlist** | `WatchlistPage.tsx` | Tracked global equities with live native/converted pricing, exchange status badges, conformal envelopes, regimes, and earnings pulse. |
| **Global News** | `NewsPage.tsx` | Real-time aggregated financial headlines with sentiment tags, credibility scoring, and regional filters. |
| **Model Accuracy** | `ModelPerformancePage.tsx` | Out-of-sample walk-forward evaluation (`MAE`, `RMSE`, `MAPE`, `Directional Accuracy`, `R²`, Always-Up / Persistence / SMA-20 / OLS baselines) for AlphaQuant Ensemble. |
| **Drift Monitor** | `DriftMonitorPage.tsx` | Two-sample KS drift test statistics, baseline vs. live return CDF comparison, and safety status monitoring. |
| **Alerts** | `AlertsPage.tsx` | VaR, volatility, RSI-14, price threshold, and regime/drift alert creation and management. |
| **Investor Guide** | `InvestorGuidePage.tsx` | Interactive educational reference explaining split-conformal intervals, rule-based market regimes, Greeks, and quantitative risk metrics. |
| **Account & Settings** | `AccountPage.tsx` | Profile management, preferred home currency, language, theme, and password settings. |

---

## 5. REST API Route Directory (`server.ts`)

```
# Authentication & User Preferences
POST   /api/auth/register                 # Create user account with salted bcrypt hash
POST   /api/auth/login                    # Authenticate & issue JWT session token
GET    /api/auth/me                       # Retrieve authenticated user profile
PUT    /api/auth/profile                  # Update profile, language, or home currency preferences
PUT    /api/auth/change-password          # Update account password

# Global Market Data, FX & Seasonality
GET    /api/stocks/search?q=:query        # Global ticker/company search across international exchanges
GET    /api/markets/indices?markets=...   # Global macro indices (supports ?markets=US,JP,EU,etc.)
GET    /api/stocks/quick-watch            # Curated quick-watch global tickers
GET    /api/fx/rates                      # Real-time FX conversion rates matrix
GET    /api/stocks/:ticker                # Live quote, currency, exchange timezone, & 52w stats
GET    /api/stocks/:ticker/history        # Historical OHLCV bars (supports multi-year ranges)
GET    /api/stocks/:ticker/seasonality    # Multi-year monthly seasonality matrix & calendar bias

# Forecasting, Split-Conformal Intervals, Regimes, Sentiment & Drift
GET    /api/predictions/:ticker?h=N&c=N   # AlphaQuant Ensemble forecast + split-conformal [lower, upper] (default 90%)
POST   /api/predictions                   # Log forecast audit snapshot for authenticated user
GET    /api/predictions/history           # User's saved forecast tracking history
GET    /api/regime/:ticker                # Rule-based trend/volatility regime state, probabilities & transition matrix
GET    /api/sentiment/:ticker             # Keyword financial-sentiment lexicon score, publisher credibility & classified events
GET    /api/drift/:ticker                 # Two-sample KS drift test statistics & p-value
GET    /api/model/metrics                 # Out-of-sample walk-forward accuracy & benchmark comparison
GET    /api/metrics/accuracy              # Alias / accuracy metrics summary
GET    /api/model/health                  # Model health & calibration status
GET    /api/strategy/backtest             # Directional strategy (e.g. sentiment_multimodal) vs. buy-and-hold simulation

# Options, Correlation, Backtesting & Earnings
GET    /api/markets/correlation           # Cross-asset market return correlation matrix
GET    /api/options/:ticker               # Options chain with Black-Scholes Greeks & IV smile mispricing
GET    /api/options/:ticker/surface       # 3D implied volatility surface grid
GET    /api/backtest/automated            # Automated walk-forward strategy backtest report
GET    /api/earnings/calendar             # Upcoming quarterly earnings dates & consensus EPS

# Portfolio, Watchlist, Broker & Alerts (JWT Protected)
GET    /api/portfolio                     # User holdings with live mark-to-market valuations
POST   /api/portfolio                     # Add holding position
POST   /api/portfolio/batch               # Batch import holdings
PUT    /api/portfolio/:id                 # Update holding position
DELETE /api/portfolio/:id                 # Delete holding position
POST   /api/portfolio/optimize            # Markowitz MVO rebalance weights & efficient frontier
POST   /api/portfolio/correlation         # Portfolio-specific pairwise correlation matrix
POST   /api/portfolio/rebalance/apply     # Apply optimized target weights to holdings
GET    /api/watchlist                     # Authenticated user watchlist
GET    /api/watchlist/pulse               # Enriched watchlist telemetry (quotes, predictions, regimes)
POST   /api/watchlist                     # Add ticker to watchlist
DELETE /api/watchlist/:ticker             # Remove ticker from watchlist
GET    /api/alerts                        # List active VaR / Volatility / RSI / Price alerts
POST   /api/alerts                        # Create alert trigger
PUT    /api/alerts/:id                    # Update/toggle alert
DELETE /api/alerts/:id                    # Delete alert
GET    /api/broker/account                # Simulated broker cash & margin state
GET    /api/broker/orders                 # Active paper orders
GET    /api/broker/trades                 # Executed trade ledger
POST   /api/broker/order                  # Submit paper buy/sell order
DELETE /api/broker/order/:orderId         # Cancel pending paper order

# Global News, Social Copy-Trade & AI Assistant
GET    /api/news                          # Live global financial news feed
GET    /api/news/:ticker                  # Ticker-specific news headlines & event tags
GET    /api/social/feed                   # Community quantitative signals feed
GET    /api/social/traders                # Featured quantitative strategies/traders
POST   /api/social/copy-trade             # Execute simulated copy-trade allocation
POST   /api/copilot/chat                  # Quantitative research copilot endpoint
POST   /api/support/chat                  # Platform support assistant endpoint
```

---

## 6. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite 8, `motion` (Framer Motion v12), Recharts 3, D3.js 7, Lucide Icons.
- **Backend**: Node.js + Express (`server.ts`) with integrated Vite middleware in development on port `3000`, `tsx`, and `yahoo-finance2`.
- **Quantitative Math Engines**: Pure TypeScript implementations of 24-factor Z-scored Ridge Regression, Depth-2 Huber GBDT, Adaptive Kalman Regime Filtering, Cosine KNN Analogs, Split-Conformal Prediction Intervals (90% default coverage), Two-Sample KS Drift Test, Rule-Based Trend/Volatility Regime Classifier, Keyword Financial-Sentiment Lexicon, Black-Scholes Greeks, and Markowitz MVO.
- **Security & Session**: `bcryptjs` password hashing, `jsonwebtoken` stateless JWT authentication, and API rate limiting.

---

## 7. Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set required secrets before production or Docker runs:
```bash
cp .env.example .env
# Generate a cryptographically strong 32+ char JWT secret:
openssl rand -hex 32
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `JWT_SECRET` | **Required in production** (`NODE_ENV=production`). Must be at least 32 characters and not a public placeholder. In development, an ephemeral random secret is generated if unset. | Ephemeral (dev) / Required (prod) |
| `ALLOW_DEMO_MODE` | Server-side flag (`true` / `false`). When `true`, requests without a valid JWT fall back to the demo user account. Keep `false` in real deployments. | `false` |
| `VITE_DEMO_MODE` | Client-side flag (`true` / `false`). Enables automatic demo-session fallback in the frontend when unauthenticated. | `false` |
| `GEMINI_API_KEY` | Optional Google Gemini API key used by `/api/support/chat` and `/api/copilot/chat` (falls back to deterministic knowledge base responses when unset). | Unset |

### 3. Start Full-Stack Development Server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser. Express API routes and Vite frontend run together on port `3000`.

### 4. Verify Build, Types & Automated Tests
```bash
npm run lint    # Run TypeScript type checks (tsc --noEmit)
npm test        # Run all unit & real-app HTTP tests (tests/*.test.ts)
npm run build   # Build production frontend bundle to dist/
npm start       # Start full-stack server via tsx server.ts
```

### 5. Docker & Docker Compose Deployment
Ensure `.env` defines a strong `JWT_SECRET` (at least 32 characters); Compose refuses to start if `JWT_SECRET` is missing:
```bash
# Option A: Docker Compose
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build

# Option B: Direct Docker Build & Run
docker build -t alphaquant-ai .
docker run -p 3000:3000 -e NODE_ENV=production -e JWT_SECRET="$(openssl rand -hex 32)" alphaquant-ai
```

---

## 8. Financial & Safety Disclaimer

*AlphaQuant AI is designed strictly for research, educational, and informational purposes. Statistical machine learning models, split-conformal prediction intervals, market regime classifications, FX reference conversions, and sentiment scores represent historical statistical associations and mathematical approximations. They do not constitute financial, investment, legal, or tax advice. Markets carry intrinsic risk, and past backtested performance does not guarantee future financial results.*
