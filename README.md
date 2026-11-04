# AlphaQuant AI — Institutional Stock Intelligence & Price Prediction Platform

An institutional-grade, full-stack quantitative financial intelligence platform engineered for **stock price prediction**, non-parametric uncertainty quantification, market regime classification, real-time concept drift monitoring, seasonality analytics, and portfolio risk management.

---

## 1. Primary Motive: Stock Price Prediction & Calibrated Uncertainty

The primary motive of AlphaQuant AI is **accurate, auditable stock price prediction**. Conventional forecasting models issue misleading deterministic point targets (e.g., *"Price will close at $132.50"*) that mask volatility and catastrophic tail risk. AlphaQuant solves this by coupling machine learning forward price forecasts with **distribution-free Split-Conformal Prediction Envelopes**, dynamic **Hidden Markov Model (HMM) Regimes**, **Financial News Sentiment & Credibility**, and **Kolmogorov-Smirnov Concept Drift Governance**.

### Primary Candlestick Forecast Engine (`InteractiveStockChart.tsx`)
- **Multi-Horizon Forward Projections**: Predicts expected close prices across configurable forecast horizons (1-Day, 5-Day, 14-Day).
- **Overlaid Prediction Envelopes**: Calibrated $[\text{Lower Bound}, \text{Upper Bound}]$ channels rendered directly over real-time OHLCV candlestick charts.
- **Integrated Technical Indicators**: SMA 20/50, Bollinger Bands, RSI-14 momentum, and MACD (12, 26, 9) signal lines.
- **Dynamic Chart Timeframes**: Real-time crosshair inspection across 1M, 3M, 6M, 1Y, and 5Y historical spans.

---

## 2. Four Core Mathematical USPs

### USP 1 — Split-Conformal Prediction Intervals
Rather than predicting a single deterministic point target, AlphaQuant provides a **finite-sample prediction interval** calibrated at nominal coverage levels ($1 - \alpha$, default $90\%$):

$$\hat{C}(X_{n+1}) = [\hat{y}_{n+1} - \hat{q}_{1-\alpha}, \; \hat{y}_{n+1} + \hat{q}_{1-\alpha}]$$

- **Guaranteed Coverage**: Non-asymptotic theorem guarantees $P(Y_{n+1} \in \hat{C}(X_{n+1})) \ge 1 - \alpha$ without Gaussian or normality assumptions on returns.
- **Non-Conformity Scoring**: Calibrates residual non-conformity scores over chronological historical validation windows.
- **Dynamic Confidence Control**: User-selectable confidence slider ($80\%$, $90\%$, $95\%$, $99\%$) instantly expands or contracts intervals.

### USP 2 — Hidden Markov Model (HMM) & Rule-Based Market Regimes
- **State Classification**: Automatically classifies active market phases using rolling volatility $\sigma_{20d}$, moving averages, and latent transition probabilities:
  - **State 0 (Bullish Steady Drift)**: Compressed volatility ($\sigma < 14\%$), tight conformal envelopes, high persistence.
  - **State 1 (High Volatility Expansion / Bear Shock)**: Elevated variance cascades ($\sigma > 24\%$), widened uncertainty bands, hedging activated.
  - **State 2 (Mean-Reverting Range)**: Sideways consolidation, bimodal oscillator reversion triggers.
- **Empirical Transition Matrix**: Continuously updates transition probabilities $P(S_t = j \mid S_{t-1} = i)$ and state persistence durations.
- **Color-Coded Status Badges**: Integrated `RegimeIndicator` badge in the header of the Dashboard, Stock Detail page, and navigation ribbon.

### USP 3 — Financial NLP Sentiment Lexicon & Publisher Credibility
- **Technical Factors**: 8 core engineered features (EMA 12/26 spread, SMA 50 spread, RSI-14 deviation, Bollinger %B, MACD impulse, recent return, volatility ratio, and intercept).
- **Curated Financial Lexicon**: Analyzes financial news feeds, scoring positive, neutral, and negative sentiment polarities.
- **Publisher Domain Reputation Weighting**: Weights headlines based on verified publisher credibility (Reuters, Bloomberg, Wall Street Journal, Financial Times, Economic Times).

### USP 4 — Kolmogorov-Smirnov Concept Drift Monitoring
- **Two-Sample Non-Parametric Test**: Compares baseline training return distributions against rolling live inference windows:

$$D_{n,m} = \sup_x |F_{1,n}(x) - F_{2,m}(x)|$$

- **Automated Fail-Safe Alarms**: Raises automatic safety warnings when statistical drift occurs ($p < 0.05$).
- **Adaptive Hedging Response**: Automatically widens conformal intervals upon drift detection to prevent empirical coverage violations during macro structural breaks.

---

## 3. Flagship Production Modules

### A. Seasonality & Calendar Alpha Engine (`SeasonalityAnalysis.tsx`)
- **Multi-Year Monthly Return Matrix**: 3-year and 5-year monthly performance heatmap matrix with color-coded positive and negative returns.
- **Monthly Statistical Profiles**: Calculates win-rate percentage, median return, average return, min/max range, and return standard deviation for all 12 calendar months.
- **Target Month Tendency Bias**: Algorithmically assigns tendency ratings (*Strong Bullish, Bullish, Neutral, Bearish, Strong Bearish*) with anomaly commentary.
- **Historical Seasonal Outperformers**: Uncovers universe equities with statistically anomalous win rates for specific seasons (Q4 Diwali rally, December Santa Claus rally, January effect, budget session).

### B. Dividend Yield & Ex-Date Cashflow Calendar (`DividendCalendar.tsx`)
- **Total Projected Annual Dividend Income**: Calculates expected annual cashflow in INR and USD run-rates based on current holdings.
- **Portfolio Dividend Yield & Yield on Cost (YoC %)**: Computes dividend yield on current market value and Yield on Cost on original purchase basis.
- **Imminent Ex-Date Alert Ribbon**: High-visibility warning banner and countdown pills (*"Today"*, *"in 3d"*, *"in 8d"*) for positions with ex-dividend dates within 14 days.
- **Monthly Cashflow Distribution Schedule**: Visualizes projected monthly dividend payouts across Jan–Dec and quarterly sums (Q1–Q4).
- **DRIP Compounding Simulator**: Simulates 1 to 10 year portfolio growth under Dividend Reinvestment Plans (DRIP) with adjustable dividend growth rates.

### C. Executive Trade Summary & Sector Risk Attribution (`ExecutiveTradeSummary.tsx`)
- **Executive Metrics Strip**: Calculates realized Sharpe Ratio, Win/Loss ratio, average holding duration (days), profit factor, and total realized P&L for all closed trades.
- **Sector Risk Attribution Breakdown**: Computes the exact percentage of total capital allocated across sectors (Technology, Energy, Finance, Consumer, Healthcare) within closed trade history.
- **Asset Class Capital Allocation**: Visualizes distribution across Domestic Equities, US Equities, and Fixed Income/Cash equivalents.
- **Auditable Trade Ledger**: Full chronological trade blotter with entry/exit timestamps, executed prices, realized gains, and exportable CSV reports.

### D. Risk-Based & Momentum RSI Alerts (`AlertsPage.tsx`)
- **Parametric Value-at-Risk (VaR) Triggers**: Configurable alerts when an asset's 1-Day, 5-Day, or 10-Day VaR (at 95% or 99% confidence) exceeds a user-defined threshold.
- **Volatility Spikes**: Triggers notifications when annualized rolling volatility crosses defined limits.
- **Automated RSI Push Notifications**: Instant browser/push notification alerts when 14-period RSI crosses below 30 (oversold reversal) or above 70 (overbought take-profit).
- **Category Filter Tabs**: Segregates alerts into *RSI Momentum, Risk (VaR/Volatility), Price Targets, and Model Drift/Regime Shifts*.

### E. Watchlist Earnings Calendar (`EarningsCalendar.tsx`)
- **Upcoming Reporting Dates**: Chronological schedule of upcoming quarterly earnings dates across all watchlist stocks.
- **Consensus EPS Estimates**: Displays Wall Street and Dalal Street consensus EPS estimates alongside reported EPS.
- **Historical Surprise Patterns**: Tracks earnings surprise percentages (beat/miss) over trailing quarters to quantify post-earnings volatility.

### F. D3 Options Volatility Surface & Greeks (`OptionsVolatilitySurface.tsx`)
- **Real-Time Black-Scholes Greeks**: $\Delta$ (Delta), $\Gamma$ (Gamma), $\Theta$ (Theta), $\nu$ (Vega), and $\rho$ (Rho) computed across strike ladders.
- **3D Implied Volatility Surface**: Interactive D3-rendered surface displaying IV smiles, skews, and term structure.
- **ATM Expected Moves**: 1-Day, 7-Day, and 30-Day expected price move envelopes derived from implied volatility.

### G. 16-Step Guided Product Spotlight Tour (`ProductTourModal.tsx`)
- **Smooth Viewport Spotlight**: Scrolls the page smoothly and renders an animated glowing halo ring cutout over the target element.
- **Dynamic Navigation Integration**: Automatically navigates across tabs (*Dashboard, Analysis, Portfolio, Alerts*) as the user steps through the tour.
- **Interactive Action Triggers**: Direct one-click launcher buttons to open specialized modals (Options Analytics, Backtesting, Broker Router, AlphaBot Copilot).

---

## 4. Platform Workspaces & Architecture

| Workspace | Component | Key Capabilities |
| :--- | :--- | :--- |
| **Public Home** | `LandingPage.tsx` | High-density quantitative overview, 9-card feature matrix, interactive math sandbox, and 16-step tour launcher. |
| **Dashboard** | `DashboardPage.tsx` | Macro market tape, primary candlestick forecast chart, 4 core ML modules below chart, sector heatmap, and earnings calendar. |
| **Stock Detail** | `StockDetailPage.tsx` | Interactive OHLCV chart, conformal envelopes, HMM regimes, sentiment, drift monitor, options IV surface, and seasonality analysis. |
| **Portfolio** | `PortfolioPage.tsx` | Holdings ledger, executive trade summary, risk attribution, dividend yield & calendar, Markowitz MVO rebalancing, and stress-tests. |
| **Watchlist** | `WatchlistPage.tsx` | Side-by-side NSE and US equities tracking, live conformal uncertainty ranges, regimes, and drift warnings. |
| **Model Governance** | `ModelPerformancePage.tsx` | Out-of-sample forward backtest metrics (MAE, RMSE, MAPE, $R^2$), benchmark comparisons, and KS drift distributions. |
| **Alerts Engine** | `AlertsPage.tsx` | Risk-based VaR alerts, automated RSI 30/70 push alerts, price thresholds, and model drift notifications. |

---

## 5. REST API Route Directory

All endpoints are served from the Node.js/Express backend (`server.ts`):

```
# Market Data & History
GET  /api/stocks/search?q=:query         # Autocomplete search across NSE & US assets
GET  /api/stocks/:ticker                 # Real-time quote (price, change, 52w high/low, PE, volume)
GET  /api/stocks/:ticker/history?days=N  # Historical OHLCV bars (supports up to 5y range)
GET  /api/stocks/:ticker/seasonality     # Multi-year monthly seasonality matrix & outperformers

# Core Machine Learning & Conformal Inference
GET  /api/predictions/:ticker?h=N&c=N    # Split-conformal forecast with [lowerBound, upperBound]
GET  /api/regimes/:ticker                # HMM regime classification (state, probabilities, persistence)
GET  /api/sentiment/:ticker              # News sentiment scores & domain credibility weights
GET  /api/drift/:ticker                  # Two-sample Kolmogorov-Smirnov drift test statistics

# Fundamental Catalysts & Options Analytics
GET  /api/earnings/calendar              # Upcoming earnings dates & consensus EPS estimates
GET  /api/options/:ticker                # Options chain with Black-Scholes Greeks & IV surface

# Portfolio, Risk & Alerts
GET  /api/portfolio                      # User equity holdings with mark-to-market valuations
POST /api/portfolio/optimize             # Markowitz Mean-Variance Optimization (MVO)
GET  /api/alerts                         # Active alerts (VaR, volatility, RSI, price)
POST /api/alerts                         # Create new alert with optional push notification
```

---

## 6. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite, `motion` (Framer Motion v12), Recharts, D3.js, Lucide Icons.
- **Backend**: Express on Node.js (with Vite middleware mounted in dev mode on port 3000), TypeScript (`tsx`).
- **Mathematical Engines**: Pure TypeScript implementations of Ridge Regression with $L_2$ regularization, Split-Conformal Prediction Envelopes, Two-Sample Kolmogorov-Smirnov hypothesis testing, Black-Scholes Greeks, Markowitz Mean-Variance Optimization, and Multi-Annual Seasonality Matrices.
- **Security & Session**: Salted bcrypt password hashing, stateless JWT session authentication, and in-memory rate limiting.

---

## 7. Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Full-Stack Development Server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser. The application runs full-stack with Express backend routes and Vite hot-reloading.

### 3. Run Automated Test Suite
```bash
npm test
```
Executes comprehensive quantitative verification suites testing:
- Split-conformal prediction intervals and empirical finite-sample coverage.
- Kolmogorov-Smirnov two-sample statistic and asymptotic $p$-value computation.
- Cross-asset Pearson correlation and covariance matrix calculations.
- API route ordering and JWT authentication fail-closed security.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 8. Financial & Safety Disclaimer

*AlphaQuant AI is designed strictly for research, educational, and informational purposes. Statistical machine learning models, split-conformal prediction intervals, market regime classifications, and sentiment scores represent historical statistical associations and mathematical approximations. They do not constitute financial, investment, legal, or tax advice. Markets carry intrinsic risk, and past backtested performance does not guarantee future financial results.*
