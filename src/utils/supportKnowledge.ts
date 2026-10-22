/**
 * Domain Knowledge Base & Context Store for AlphaQuant AI
 * Contains structured domain facts, quantitative finance concepts,
 * technical indicators, and feature workflows.
 */

export function getPlatformKnowledge(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('sign up') || p.includes('register') || p.includes('create account') || p.includes('get started')) {
    return `### Getting Started with AlphaQuant AI 🚀

Welcome to AlphaQuant AI! To access the full trading terminal and protected workspaces, follow these quick steps:

1. **Click "Sign Up"** in the top navigation bar or the hero action button.
2. **Enter your details**: Provide your full name, email address, and a secure password.
3. **Instant Access**: Upon registration, you are immediately logged in with full access to:
   - 📊 **Live Market Dashboard** (Indices tape, macro regime indicators, top movers)
   - 📑 **Custom Watchlist** (Multi-asset tracking with conformal confidence bands)
   - 💼 **Portfolio Tracker** (Mark-to-market positions, cost basis, unrealized P&L)
   - 🔍 **Deep Stock Analysis** (Interactive OHLCV charts, SMA 20/50, Bollinger Bands, RSI & MACD)
   - 📈 **Model Performance & Drift Monitors**

*Tip: If you already have an account, click **Client Login** in the top right.*`;
  }

  if (p.includes('login') || p.includes('log in') || p.includes('sign in') || p.includes('client access')) {
    return `### Client Login & Authentication 🔐

To sign in to your AlphaQuant AI account:
1. Click the **"Log In"** button in the top navigation bar.
2. Enter your registered email address and password.
3. Click **"Sign In to Platform"**.

Once verified, your personal session will load automatically, restoring your saved watchlist symbols, equity portfolio holdings, and active alert rules.`;
  }

  if (p.includes('accuracy') || p.includes('how accurate') || p.includes('performance') || p.includes('hit rate') || p.includes('metrics') || p.includes('precision')) {
    return `### Current Prediction Accuracy & Model Evaluation Metrics 🎯

AlphaQuant AI evaluates models using strictly out-of-sample forward backtesting without time-series lookahead bias:

1. **Ridge Regression Architecture (8 Technical Features)**:
   - Predicts forward returns using a regularized Ridge Regression trained on historical OHLCV features (EMA spread, SMA-50 spread, RSI-14 deviation, Bollinger %B, MACD impulse, recent return, volatility ratio, and intercept).
   - No hardcoded offsets, arbitrary scaling, or synthetic fallback metrics.

2. **Split-Conformal Prediction Intervals**:
   - Calculates non-parametric empirical prediction intervals $[\\hat{y} - \\hat{q}, \\hat{y} + \\hat{q}]$ using calibration-window non-conformity scores.
   - Provides finite-sample validity across changing market regimes.

3. **Evaluation Metrics**:
   - Evaluated out-of-sample with real MAE, RMSE, MAPE, $R^2$, and directional hit rate.
   - All baseline comparisons (SMA-20, Plain Linear OLS, Naive Last-Price) are computed on the identical out-of-sample test split.

Visit the **"Model Performance"** tab in the sidebar to review full live backtest evaluations!`;
  }

  if (p.includes('conformal') || p.includes('uncertainty') || p.includes('confidence interval') || p.includes('envelope') || p.includes('bounds')) {
    return `### Split-Conformal Prediction Intervals Explained 🎯

Conventional financial tools present single deterministic point estimates (e.g. *"Price will be ₹3,025"*), ignoring tail risk and volatility variance.

AlphaQuant AI implements **Split-Conformal Prediction Intervals**:
- **Finite-Sample Mathematical Coverage**: Guarantees that the true price will reside inside the interval $[\\hat{y} - \\hat{q}, \\hat{y} + \\hat{q}]$ with calibrated nominal coverage (default 90%).
- **Calibrated Residuals**: Calibration is computed on out-of-sample historical validation data without unrealistic Gaussian distribution assumptions.
- **Uncertainty Width Metric**: As market turbulence rises, the prediction envelope dynamically widens, warning traders of heightened dispersion before taking a position.`;
  }

  if (p.includes('regime') || p.includes('market state') || p.includes('volatility state')) {
    return `### Rule-Based Market Regime Classifier 📊

Financial markets transition between distinct volatility and trend environments:

1. **State 0: Low Volatility / Bullish**
   - Price above long-term trend lines, contained volatility, positive directional momentum.
   - Conformal intervals contract; trend-following signals exhibit lower dispersion.
2. **State 1: High Volatility / Bearish**
   - Elevated volatility, negative momentum, and wider price dispersion.
   - Conformal intervals automatically expand to reflect elevated risk.

The regime classifier conditions risk envelopes dynamically to align with prevailing market conditions.`;
  }

  if (p.includes('drift') || p.includes('kolmogorov') || p.includes('ks') || p.includes('distribution')) {
    return `### Kolmogorov-Smirnov (KS) Concept Drift Monitoring ⚡

Financial time-series data is non-stationary—patterns that worked in historical backtests can degrade when market dynamics shift.

- **Two-Sample KS Test**: We continuously evaluate the two-sample Kolmogorov-Smirnov test comparing historical training distributions with the live inference window.
- **Statistical Significance ($p < 0.05$)**: When empirical CDF divergence exceeds critical values, an automated **Distribution Drift Alert** is triggered.
- **Safety Precaution**: Upon drift detection, traders are alerted to possible distribution shifts in the underlying asset returns.`;
  }

  if (p.includes('sentiment') || p.includes('news') || p.includes('credibility') || p.includes('fact')) {
    return `### Keyword Sentiment Lexicon & Domain Credibility 📰

AlphaQuant AI combines price analysis with structured news intelligence:

1. **Keyword Sentiment Lexicon**: Scans financial headlines and summaries for positive and negative market-specific keywords to produce a normalized tone polarity.
2. **Domain Credibility Engine**: Weights reporting from established institutional publishers (Reuters, Bloomberg, WSJ, Financial Times, Economic Times) higher than unverified social sources.
3. **Signal Integration**: Sentiment indicators provide supplemental context alongside quantitative technical factors.`;
  }

  if (p.includes('watchlist') || p.includes('wishlist') || p.includes('favorite') || p.includes('add stock')) {
    return `### Managing Your Custom Watchlist 📑

You can monitor your favorite assets in one unified terminal matrix:

1. **Navigation**: Click **"Watchlist"** in the top navigation or sidebar.
2. **Add Tickers**: Use the quick add input (e.g., \`RELIANCE.NS\`, \`TCS.NS\`, \`NVDA\`, \`AAPL\`).
3. **Intelligence Matrix**: Each card displays:
   - Live mark-to-market quote & daily percentage change
   - Split-conformal price interval [Lower Bound — Upper Bound]
   - Rule-based market regime state
   - Keyword sentiment polarity score
   - Real-time KS drift validation status`;
  }

  if (p.includes('portfolio') || p.includes('holdings') || p.includes('p&l') || p.includes('profit') || p.includes('loss')) {
    return `### Real-Time Portfolio Management 💼

The Portfolio feature allows you to track and stress-test your equity investments:

1. **Log in or Sign Up**: Access the Portfolio tab from the top bar or sidebar.
2. **Add Positions**: Enter the stock ticker, quantity of shares, and average purchase price.
3. **Live Mark-to-Market**:
   - Total capital invested vs. current real-time market valuation
   - Unrealized Profit & Loss (P&L in currency and percentage)
   - Asset allocation weights across Indian (NSE) and US global equities
4. **Direct Analysis**: Click any position to view its full technical chart and predictive bounds.`;
  }

  if (p.includes('ticker') || p.includes('stock') || p.includes('exchange') || p.includes('nse') || p.includes('nasdaq')) {
    return `### Supported Markets & Tickers 🌐

AlphaQuant AI covers institutional instruments across dual exchanges:

- **Indian Equities (NSE)**: \`RELIANCE.NS\`, \`TCS.NS\`, \`INFY.NS\`, \`HDFCBANK.NS\`, \`ICICIBANK.NS\`, \`TMCV.NS\`, \`TMPV.NS\`, \`ETERNAL.NS\`, \`BHARTIARTL.NS\`, \`WIPRO.NS\`
- **US Equities (NASDAQ / NYSE)**: \`NVDA\`, \`AAPL\`, \`MSFT\`, \`GOOGL\`, \`AMZN\`, \`TSLA\`, \`META\`
- **Macro Benchmarks**: Nifty 50, Sensex, S&P 500, Nasdaq 100, and India VIX.

Use the search bar in the top navigation to inspect any ticker with one click.`;
  }

  if (p.includes('indicator') || p.includes('custom indicator') || p.includes('formula') || p.includes('breakout') || p.includes('macd') || p.includes('rsi') || p.includes('bollinger')) {
    return `### Custom Algorithmic Indicators & Mathematical Formulas 📐

Here are high-conviction quantitative indicator formulations implemented in AlphaQuant AI:

1. **Conformal Volatility Breakout Envelope**:
   - **Formula**: $Upper_t = SMA_{20}(P) + k \\cdot \\hat{q}_{conf}$, $Lower_t = SMA_{20}(P) - k \\cdot \\hat{q}_{conf}$
   - **Signal**: Long entry when $Close_t > Upper_{t-1}$ with volume expansion $> 1.5 \\times Vol_{SMA20}$.
   - **Risk Exit**: Trailing stop at $SMA_{20}(P)$ or calibrated $Lower$ bound.

2. **Adaptive Regime-Momentum (RSI + MACD Impulse)**:
   - **Condition**: Buy when $MACD_{Hist} > 0$, $EMA_{12} > EMA_{26}$, and $RSI_{14} \\in [42, 65]$.
   - **Exit**: $MACD_{Hist} < 0$ or $RSI_{14} > 72$ (overbought divergence).

3. **Average True Range (ATR) Scaled Position Sizing**:
   - $Qty = \\lfloor (Account \\times RiskPct) / (2 \\times ATR_{14}) \\rfloor$.

*You can test these strategies in the **Backtest** module directly from the top navigation!*`;
  }

  if (p.includes('risk') || p.includes('parameter') || p.includes('stop loss') || p.includes('position size') || p.includes('sizing')) {
    return `### Terminal Risk Parameter Guidance 🛡️

Rigorous capital preservation rules for trading with conformal forecast models:

1. **Conformal Coverage Level (Confidence)**:
   - **90% Confidence (Default)**: Optimal balance between interval width and statistical coverage.
   - **95% Confidence**: Tighter tail risk protection. Produces wider intervals suited for volatile regimes or earnings weeks.
   - **80% Confidence**: Narrower operational bands, suited for intraday range-bound mean reversion.

2. **Stop-Loss Sizing & Ceilings**:
   - **Hard Stop-Loss**: Anchor directly below the Conformal Lower Bound: $Stop = LowerBound \\times (1 - 0.005)$.
   - **Risk Per Trade**: Never risk more than 1.0% to 2.0% of total portfolio equity on any single asset.
   - **Profit Target Ceilings**: Minimum 2:1 Reward-to-Risk ratio targeting the Conformal Upper Bound.

3. **Broker Protection**:
   - Configure automatic stop-loss orders in the **Broker Router** ticket before submitting live fills.`;
  }

  if (p.includes('option') || p.includes('greek') || p.includes('delta') || p.includes('gamma') || p.includes('theta') || p.includes('vega') || p.includes('smile') || p.includes('black scholes')) {
    return `### Options Chains & Black-Scholes Greeks Analytics 📈

Access the derivatives terminal via **"Options & Greeks"** in the top navigation bar:

1. **Black-Scholes Greeks**:
   - **Delta (Δ)**: Rate of change of option price with respect to underlying spot price. Calls: $[0, 1]$, Puts: $[-1, 0]$.
   - **Gamma (Γ)**: Acceleration of Delta per ₹1/$1 underlying movement: $\\Gamma = \\frac{N'(d_1)}{S \\sigma \\sqrt{T}}$.
   - **Theta (Θ)**: Daily time-decay penalty: Options lose value as expiration approaches.
   - **Vega (ν)**: Sensitivity to a 1% shift in Implied Volatility ($S \\sqrt{T} N'(d_1)$).

2. **Implied Volatility (IV) Smile**:
   - Visualizes volatility skew across strikes. Out-of-the-money puts often price higher IV due to crash-protection demand.
3. **Expected Moves**:
   - Projections for 1-Day, 7-Day, and 30-Day price dispersion: $\\pm Spot \\times IV \\times \\sqrt{t/365}$.
4. **Put/Call Ratio (PCR)**:
   - Volume PCR & Open Interest PCR identifying bullish/bearish market positioning.`;
  }

  if (p.includes('backtest') || p.includes('simulate') || p.includes('sharpe') || p.includes('drawdown') || p.includes('xgboost')) {
    return `### Automated Quantitative Backtesting Engine 📊

Simulate predictive trading strategies against Buy-and-Hold benchmarks:

1. **Available Strategies**:
   - **XGBoost + Conformal Quantile Strategy**: Buys when price touches the lower calibrated quantile with positive momentum; trims near the upper bound.
   - **Conformal Volatility Envelope Breakout**: Captures trending momentum surges piercing outside volatility bands.
   - **HMM Regime-Adaptive Trend Following**: Re-allocates between cash and equity based on low/high volatility regime states.

2. **Performance Metrics**:
   - **Cumulative Strategy Value vs. Benchmark Curve**
   - **Annualized Sharpe Ratio**: $(R_p - R_f) / \\sigma_p$
   - **Maximum Peak-to-Trough Drawdown (%)**
   - **Win Rate & Profit Factor**: Ratio of gross profits to gross losses

Launch the simulation anytime by clicking **"Backtest"** in the top bar!`;
  }

  if (p.includes('broker') || p.includes('alpaca') || p.includes('paper') || p.includes('order') || p.includes('trade')) {
    return `### Direct Broker Router (Alpaca Paper Gateway) ⚡

Execute paper trades with institutional order routing:

1. **Account Integration**: Connected to Alpaca Paper Trading Gateway with $100,000 buying power.
2. **Order Types**:
   - **Market Orders**: Immediate execution at prevailing spot price with realistic slippage.
   - **Limit Orders**: Executes only when price meets or beats your designated limit.
3. **Risk Management Automation**:
   - Configure mandatory Stop-Loss Price and Take-Profit Ceilings on order entry.
4. **Order Blotter**: Review real-time pending, filled, and cancelled orders.

Open the order ticket by clicking **"Broker Router"** in the top navigation.`;
  }

  if (p.includes('social') || p.includes('copy') || p.includes('copy-trade') || p.includes('community') || p.includes('trader')) {
    return `### Social Sentiment & Verified Copy-Trading 👥

Tap into crowdsourced intelligence and institutional quant portfolios:

1. **Real-Time Community Feeds**: Aggregates discussions from simulated WallStreetBets, FinTwit, and quant desks. Filter by ticker to view sentiment tags and upvotes.
2. **Verified Trader Leaderboard**: Review track records of top verified quants with annualized returns, Sharpe ratios, and max drawdowns.
3. **1-Click Portfolio Mirroring**: Mirror a top trader's asset allocation directly into your active portfolio with proportional rebalancing.

Click **"Social & Copy-Trade"** in the top bar to inspect active feeds.`;
  }

  if (p.includes('tour') || p.includes('walkthrough') || p.includes('guide') || p.includes('steps')) {
    return `### 12-Step Guided Product Tour 🚀

Explore every layer of the AlphaQuant AI terminal:
1. Terminal Architecture & Core ML
2. Global Macro Market Tape
3. Aggregate Price Accuracy Metric (100% - MAPE)
4. Split-Conformal Prediction Envelopes
5. Rule-Based & HMM Market Regimes
6. Options Chains & Black-Scholes Greeks
7. Automated Quantitative Backtesting
8. Direct Broker Router (Alpaca Paper Trading)
9. Social Trading & Verified Copy-Trade
10. Markowitz Modern Portfolio Optimizer
11. Kolmogorov-Smirnov (KS) Drift Monitor
12. AlphaBot AI Copilot

Click **"Tour"** in the top navigation to begin the interactive walkthrough!`;
  }

  // General fallback
  return `### Hello! I'm the AlphaQuant AI Assistant 🤖

I'm here to help you navigate the AlphaQuant AI Stock Intelligence Platform:

- **Platform Navigation**: Sign up, log in, view the Dashboard, or manage your Watchlist & Portfolio.
- **Quantitative Models**: How **split-conformal intervals**, **rule-based market regimes**, and **sentiment analysis** work.
- **Data & Drift**: Understanding Kolmogorov-Smirnov drift tests and risk bounds.
- **Supported Tickers**: Searching NSE stocks (\`RELIANCE.NS\`, \`TCS.NS\`, etc.) and US equities (\`NVDA\`, \`AAPL\`, etc.).

*What would you like to explore today?*`;
}

export const generateSupportFallback = getPlatformKnowledge;
