# AlphaQuant AI — Enterprise Stock Intelligence Platform

An institutional-grade, full-stack financial intelligence platform engineered for quantitative price forecasting, non-parametric uncertainty quantification, market regime classification, and real-time concept drift monitoring.

---

## 1. Core Architecture & Implemented Models

### USP 1 — Split-Conformal Prediction Intervals
Rather than predicting a single misleading deterministic point target, AlphaQuant provides a **finite-sample prediction interval** calibrated at nominal coverage levels (default $90\%$):
$$\hat{C}(X_{n+1}) = [\hat{y}_{n+1} - \hat{q}_{1-\alpha}, \; \hat{y}_{n+1} + \hat{q}_{1-\alpha}]$$
- Quantifies market uncertainty without arbitrary Gaussian distribution assumptions.
- Calibrates residual non-conformity scores over chronological historical validation windows.
- User preference: The user's `confidenceLevel` preference directly drives the interval calculations.
- Clear user guidance: Prediction intervals represent mathematical bounds of uncertainty and are not market guarantees.

### USP 2 — Rule-Based Market Regime Classifier
- Classifies market phases based on moving averages and rolling volatility $\sigma_{20d}$:
  - **Regime 0**: Low Volatility / Bullish steady drift
  - **Regime 1**: High Volatility / Bearish tail risk
- Computes empirical transition matrix, state persistence probabilities, and regime stability indices.
- Dynamically widens or contracts uncertainty intervals based on the active regime state.

### USP 3 — Keyword Sentiment Lexicon & Publisher Credibility
- **Technical Factors**: 8 core engineered features (EMA 12/26 spread, SMA 50 spread, RSI-14 deviation, Bollinger %B, MACD impulse, recent return, volatility ratio, and intercept).
- **Keyword Sentiment Lexicon**: Curated financial dictionary classifying news headlines into positive, neutral, and negative sentiment polarities.
- **Publisher Domain Credibility**: Weights headlines based on verified financial news publisher reputation (Reuters, Bloomberg, WSJ, Financial Times, Economic Times).

### USP 4 — Concept Drift Monitoring (Two-Sample Kolmogorov-Smirnov Test)
- Evaluates the two-sample Kolmogorov-Smirnov test comparing baseline training return distributions against rolling inference windows.
- Calculates empirical $D$-statistics and asymptotic $p$-values.
- Triggers automatic safety warnings when distribution drift is detected ($p < 0.05$).

---

## 2. Interactive UI & Modern Motion Architecture

AlphaQuant AI features a modern, fluid user experience built with React 19, Tailwind CSS, and `motion` (Framer Motion v12):

### A. Animated Quant Copilot Card (`AnimatedQuantCard.tsx`)
- **Frosted Glassmorphism**: Translucent backdrop blur (`backdrop-blur-2xl`), subtle gradient borders, and soft ambient glowing orbs.
- **Morphing AI Insight Bubble**: Fluid spring-driven height expansion and text morphing across quantitative scenarios (split-conformal intervals, market regimes, keyword sentiment, Markowitz MVO frontier, KS drift audit).
- **Simulated Real-Time AI Inference**: Interactive reasoning state with shimmering progress indicator.
- **Micro-Interactions**:
  - Micro-bounce feedback on Thumbs Up and Thumbs Down.
  - One-click clipboard copy with animated confirmation toast.
  - Smooth rotating cycle button to step through scenarios.

### B. Typewriter Command Bar & Combobox (`CompanySearchCombobox.tsx`)
- Animated typewriter placeholder cycling through natural-language prompts with a blinking cursor.
- Keyboard shortcut indicator (`⌘K` / `Ctrl+K`).
- Instant debounced search supporting both company names (e.g., "Reliance", "Nvidia", "Tata", "Apple") and exchange tickers.
- One-click scenario chips for rapid analysis.

### C. Interactive Mathematical Stress-Test Sandbox (`LandingPage.tsx`)
- **Dual Interactive Controls**:
  - **Market Regime**: Bullish Low-Vol, Mean-Reverting, and Turbulent Crisis Shock.
  - **Coverage Bound ($1 - \alpha$)**: $80\%$, $90\%$, $95\%$, and $99\%$ confidence levels.
- Real-time reactive recalculation of interval widths, lower/upper price envelopes, regime transition probabilities, and KS drift p-values.

### D. Infinite Market Marquee Ribbon
- Continuous, hardware-accelerated ticker tape displaying sample market quotes across domestic and global indices (NIFTY 50, SENSEX, BANK NIFTY, S&P 500, NASDAQ 100, RELIANCE, NVDA, TCS, AAPL, MSFT) with hover-to-pause.

### E. Unified Navigation & Workspaces
- Balanced sticky header with instant Dark/Light theme switching.
- Permanently visible **Sign Out** button across both the top navigation bar and workspace sidebar.
- Responsive mobile navigation bar with balanced actions.

---

## 3. Platform Capabilities & Workspaces

The platform provides 6 distinct workspaces gated by authentication (with optional Demo mode when enabled):

1. **Live Market Dashboard (`DashboardPage.tsx`)**:
   - Market tape, macro regime indicators, top movers, and rapid ticker forecast inspector.
   - Quick insight cards and interactive regime status telemetry.
2. **Custom Asset Watchlist (`WatchlistPage.tsx`)**:
   - Side-by-side comparison of Indian (NSE) and US (NASDAQ/NYSE) stocks.
   - Real quotes, conformal uncertainty ranges, market regimes, and concept drift flags.
3. **Portfolio Management (`PortfolioPage.tsx`)**:
   - Mark-to-market valuation, unrealized P&L, asset allocation breakdown, and Markowitz Mean-Variance Optimization (MVO) efficient frontier.
4. **Deep Stock Analysis (`StockDetailPage.tsx`)**:
   - Interactive candlestick OHLCV charts with SMA 20/50, Bollinger Bands, RSI & MACD subcharts.
   - Split-conformal prediction interval overlays and factor attributions.
5. **Model Backtesting & Drift Audit (`ModelPerformancePage.tsx`)**:
   - Out-of-sample forward backtest metrics (MAE, RMSE, MAPE, $R^2$, Directional Accuracy) and empirical benchmark comparisons.
   - Two-sample Kolmogorov-Smirnov drift test distribution histograms and critical thresholds.
6. **Alerts & News Intelligence (`AlertsPage.tsx`)**:
   - Rule-based breakout and volatility alerts.
   - Keyword sentiment polarity and publisher domain credibility scoring.

---

## 4. Empirical Evaluation & Architecture Status

### Active Production Architecture (TypeScript / Node.js)
The active running web application is fully powered by a TypeScript engine:
- **Model**: Ridge Regression with $L_2$ regularization trained on 8 technical factor inputs.
- **Uncertainty**: Split-Conformal prediction intervals calibrated on chronological out-of-sample residuals.
- **Regimes**: Rule-based trend and volatility classifier.
- **Sentiment**: Keyword sentiment lexicon with publisher domain reputation weighting.
- **Baselines**: Genuine out-of-sample baseline models (SMA-20, Plain Linear OLS, Naive Last-Price) computed dynamically on the exact same test split.

### Python Research Modules (Experimental — Not Wired into App)
The repository contains standalone Python modules in:
- `ml/` (XGBoost, Gaussian HMM, drift detector, conformal predictor)
- `fake_news_detection/` (verification engine)
- `sentiment_analysis/` (FinBERT transformer analyzer)
- `backend/` (FastAPI service)

> **Note on Python Modules**: These Python components are experimental research prototypes and are not wired into the active TypeScript web application. The active application runs entirely on Node.js/TypeScript.

---

## 5. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, `motion` (Framer Motion v12), Recharts, Lucide Icons
- **Full-Stack Runtime**: Express + Node.js (with Vite dev middlewares), tsx
- **Active ML & Math Engine**: Pure TypeScript implementation of Ridge Regression (8 technical features), Split-Conformal prediction intervals, two-sample KS hypothesis testing, and Markowitz portfolio optimization.
- **Data Ingestion**: Yahoo Finance chart API with graceful simulated fallback when live market feeds are unavailable.
- **Security & Authentication**: Salted bcrypt password hashing, stateless JWT session verification, optional opt-in demo mode (`ALLOW_DEMO_MODE=true`).

---

## 6. Project Structure

```
├── .env.example              # Environment variables template (no secrets)
├── package.json              # Full-stack dependencies and scripts
├── server.ts                 # Express full-stack API server & Vite middleware
├── vite.config.ts            # Vite bundler configuration
├── tsconfig.json             # TypeScript compiler settings
├── src/
│   ├── App.tsx               # Main application routing & workspace shell
│   ├── index.css             # Tailwind v4 theme, keyframe animations, typography
│   ├── main.tsx              # React DOM entrypoint
│   ├── types/                # TypeScript domain interfaces & types
│   ├── components/           # UI components
│   ├── context/              # Auth & Theme providers
│   ├── pages/                # Workspace pages (Dashboard, Markets, Portfolio, etc.)
│   ├── server/               # Math engines, indicators, and store
│   │   ├── math/             # Ridge regression, conformal, KS drift, portfolio optimizer
│   │   └── services/         # Stock data fetchers and ticker catalog
│   └── services/             # Frontend API client
├── ml/                       # Experimental Python ML modules (not wired into app)
├── fake_news_detection/      # Experimental claim verification (not wired into app)
└── sentiment_analysis/       # Experimental FinBERT modules (not wired into app)
```

---

## 7. Quick Start (Local Development)

### Full-Stack Run (Node.js + Express + React on port 3000)
```bash
# 1. Install dependencies
npm install

# 2. Run full-stack dev server
npm run dev
```
Open **http://localhost:3000** in your browser.

### Running the Quantitative & API Test Suite
```bash
npm test
```
Executes the comprehensive verification suite testing:
1. Split-conformal prediction interval and empirical finite-sample coverage calculation
2. Kolmogorov-Smirnov two-sample statistic and asymptotic p-value computation
3. Cross-asset Pearson correlation and covariance matrix engine
4. Route ordering verification ensuring `/api/predictions/history` precedes `/:ticker`
5. Authentication 401 fail-closed security when authorization tokens are missing or invalid

### Docker Deployment
```bash
docker-compose up --build
```

---

## 8. Configuration (`.env`)

Copy the template configuration file before running in custom environments:
```bash
cp .env.example .env
```

Key environment settings:
```ini
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secure_random_jwt_secret_here
ALLOW_DEMO_MODE=false
VITE_DEMO_MODE=false
CONFIDENCE_LEVEL=0.90
REGIME_COMPONENTS=2
DRIFT_P_VALUE_THRESHOLD=0.05
```

---

## 9. Financial & Safety Disclaimer

*AlphaQuant AI is designed strictly for research, educational, and informational purposes. Statistical models, conformal prediction intervals, and sentiment scores represent historical statistical associations. They do not constitute financial, investment, legal, or tax advice. Markets carry intrinsic risk, and past backtested performance does not guarantee future financial results.*
