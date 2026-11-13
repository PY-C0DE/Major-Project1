# AlphaQuant AI — Global Institutional Stock Intelligence & Price Prediction Platform

An institutional-grade, full-stack quantitative financial intelligence platform engineered for **global stock price prediction**, **distribution-free conformal uncertainty quantification**, **market regime classification**, **real-time concept drift governance**, **multi-currency FX intelligence**, and **portfolio optimization**.

---

## 1. Primary Motive: Auditable Global Stock Price Prediction

Conventional forecasting systems output single deterministic price targets that hide volatility regimes and tail risk. **AlphaQuant AI** pairs an out-of-sample, zero-lookahead stacked ensemble (`v4.0 ML Core`) with calibrated **Split-Conformal Prediction Envelopes**, **Hidden Markov Model (HMM) Regimes**, **Financial NLP News Sentiment & Classified Catalyst Events**, and **Kolmogorov-Smirnov Concept Drift Governance** across global equity exchanges.

### Stacked Quantitative Ensemble Engine (`v4.0` — `src/server/math/modelEngine.ts`)
Every forecast strictly prevents lookahead bias by fitting scalers, trees, regression weights, and meta-stacking coefficients exclusively on historical training bars prior to the target index:
1. **24-Factor Standardized Feature Vector**: Technical spreads (EMA 12/26, SMA 50), RSI-14, Bollinger %B, MACD impulse, volatility regime ratios, microstructure gap, intraday flow, linear trend quality ($\text{slope} \times R^2$), Donchian channel position, and OBV flow scaled in Garman-Klass + close-to-close blended volatility space (`estimateBarDailyVol`).
2. **Walk-Forward Huberized Ridge Regressor**: 3-fold expanding time-series cross-validation for $L_2$ regularization in volatility-normalized (Sharpe) space.
3. **Regularized Depth-2 Gradient-Boosted Decision Trees (GBDT)**: Huber loss optimization with minimum-leaf constraints.
4. **Adaptive State-Space Kalman / Regime Filter**: Autocorrelation-gated trend vs. mean-reversion estimator.
5. **Cosine-Similarity Pattern Analog Forecaster (KNN)**: Regime-matched historical analog lookup in standardized feature space.
6. **Out-of-Sample Meta-Stacker & Ornstein-Uhlenbeck Propagation**: Bayesian shrinkage weighting (`shrinkageGain`) across all four base learners with multi-horizon path propagation (`1D`, `5D`, `14D`).

---

## 2. Four Core Mathematical USPs

### USP 1 — Split-Conformal Prediction Intervals (`conformal.ts`)
Provides finite-sample prediction envelopes calibrated at nominal coverage ($1 - \alpha$, user-adjustable across $80\%, 90\%, 95\%, 99\%$):

$$\hat{C}(X_{n+1}) = [\hat{y}_{n+1} - \hat{q}_{1-\alpha}, \; \hat{y}_{n+1} + \hat{q}_{1-\alpha}]$$

- **Distribution-Free Coverage Guarantee**: $P(Y_{n+1} \in \hat{C}(X_{n+1})) \ge 1 - \alpha$ without Gaussian return assumptions.
- **Residual Non-Conformity Calibration**: Computes quantile envelopes over chronological out-of-sample validation windows.

### USP 2 — Hidden Markov Model (HMM) Market Regimes (`hmmRegime.ts`)
- **Three-State Classification**:
  - **State 0 (Bullish Steady Drift)**: Compressed volatility, tight conformal envelopes, high persistence.
  - **State 1 (High Volatility Expansion / Bear Shock)**: Elevated variance cascades, widened prediction intervals, defensive risk posture.
  - **State 2 (Mean-Reverting Range)**: Sideways consolidation with oscillator reversion cues.
- **Empirical Transition Matrix & Persistence**: Tracks state transition probabilities $P(S_t = j \mid S_{t-1} = i)$ and expected holding duration, surfaced via header `RegimeIndicator` badges and graphical HMM visualizers.

### USP 3 — Financial NLP Sentiment, Credibility & Classified Event Audit (`nlpEngine.ts`)
- **Curated Financial Lexicon**: Scores global news headlines for bullish, neutral, and bearish polarity.
- **Publisher Reputation Weighting**: Weights articles using verified financial publisher credibility (Reuters, Bloomberg, WSJ, Financial Times, Economic Times, Nikkei, etc.).
- **Classified Event Feed**: Categorizes catalysts (Earnings, Macro/Central Bank, M&A/Product, Analyst Actions, Regulatory) in a dedicated analytical module.

### USP 4 — Two-Sample Kolmogorov-Smirnov Concept Drift Detection (`driftDetector.ts`)
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
- **Markowitz Mean-Variance Optimizer (`portfolioOptimizer.ts`)**: Efficient frontier visualization with Sharpe-maximizing, minimum-variance, and constrained rebalancing proposals plus CSV/JSON import/export.
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
| **Model Accuracy** | `ModelPerformancePage.tsx` | Out-of-sample walk-forward evaluation (`MAE`, `RMSE`, `MAPE`, `Directional Accuracy`, `R²`, Random Walk comparison) for Model `v4.0`. |
| **Drift Monitor** | `DriftMonitorPage.tsx` | Kolmogorov-Smirnov test statistics, baseline vs. live return CDF comparison, and safety status Governance. |
| **Alerts** | `AlertsPage.tsx` | VaR, volatility, RSI-14, price threshold, and regime/drift alert creation and management. |
| **Investor Guide** | `InvestorGuidePage.tsx` | Interactive educational reference explaining conformal intervals, HMM regimes, Greeks, and quantitative risk metrics. |
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

# Machine Learning, Conformal Inference, Regimes, NLP & Drift
GET    /api/predictions/:ticker?h=N&c=N   # v4.0 stacked ensemble forecast + conformal [lower, upper]
POST   /api/predictions                   # Log forecast audit snapshot for authenticated user
GET    /api/predictions/history           # User's saved forecast tracking history
GET    /api/regime/:ticker                # HMM regime state, probabilities & transition matrix
GET    /api/sentiment/:ticker             # NLP sentiment polarity, publisher credibility & classified events
GET    /api/drift/:ticker                 # Two-sample Kolmogorov-Smirnov drift statistics & p-value
GET    /api/model/metrics                 # Out-of-sample walk-forward accuracy & benchmark comparison
GET    /api/metrics/accuracy              # Alias / accuracy metrics summary
GET    /api/model/health                  # Model governance & health status
GET    /api/strategy/backtest             # Directional strategy vs. buy-and-hold simulation

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
- **Quantitative Math Engines**: Pure TypeScript implementations of 24-factor Z-scored Ridge Regression, Depth-2 Huber GBDT, Adaptive Kalman Filtering, Cosine KNN Analogs, Split-Conformal Prediction, Two-Sample Kolmogorov-Smirnov Testing, HMM Regimes, Black-Scholes Greeks, and Markowitz MVO.
- **Security & Session**: `bcryptjs` password hashing, `jsonwebtoken` stateless JWT authentication, and API rate limiting.

---

## 7. Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` if overriding secrets or optional data provider keys (`JWT_SECRET`, `NEWS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, etc.). The platform works out of the box on port `3000`.

### 3. Start Full-Stack Development Server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser. Express API routes and Vite frontend run together on port `3000`.

### 4. Verify Build, Types & Automated Tests
```bash
npm run lint    # Run TypeScript type checks (tsc --noEmit)
npm test        # Run quantitative, correlation, security & route tests
npm run build   # Build production frontend bundle to dist/
npm start       # Start full-stack server via tsx server.ts
```

---

## 8. Financial & Safety Disclaimer

*AlphaQuant AI is designed strictly for research, educational, and informational purposes. Statistical machine learning models, split-conformal prediction intervals, market regime classifications, FX reference conversions, and sentiment scores represent historical statistical associations and mathematical approximations. They do not constitute financial, investment, legal, or tax advice. Markets carry intrinsic risk, and past backtested performance does not guarantee future financial results.*
