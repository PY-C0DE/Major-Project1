/**
 * AlphaQuant AI - Customer Support & Quantitative Knowledge Engine
 * Provides comprehensive domain knowledge and resilient customer assistance
 * with structured guidance on platform features, quantitative models, and navigation.
 */

export function generateSupportFallback(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('sign up') || p.includes('register') || p.includes('create account') || p.includes('get started')) {
    return `### Getting Started with AlphaQuant AI 🚀

Welcome to AlphaQuant AI! To access the full trading terminal and protected workspaces, follow these quick steps:

1. **Click "Sign Up"** in the top navigation bar or the hero action button.
2. **Enter your details**: Provide your full name, email address, and a secure password.
3. **Instant Access**: Upon registration, you are immediately logged in with full access to:
   - 📊 **Live Market Dashboard** (Indices tape, macro regime indicators, top movers)
   - 📑 **Custom Watchlist** (Multi-asset tracking with 90% confidence bands)
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

  if (p.includes('conformal') || p.includes('uncertainty') || p.includes('confidence interval') || p.includes('envelope') || p.includes('bounds')) {
    return `### 90% Conformal Prediction Explained 🎯

Conventional financial tools present single deterministic point estimates (e.g. *"Price will be ₹3,025"*), ignoring tail risk and volatility variance.

AlphaQuant AI implements **Split-Conformal Prediction (MAPIE formulation)**:
- **Finite-Sample Mathematical Coverage**: Guarantees that the true price will reside inside the interval $[\\hat{y} - \\hat{q}, \\hat{y} + \\hat{q}]$ with exactly 90% calibrated confidence.
- **Calibrated Residuals**: Calibration is computed on out-of-sample forward validation data without unrealistic Gaussian distribution assumptions.
- **Uncertainty Width Metric**: As market turbulence rises, the prediction envelope dynamically widens, warning traders of heightened dispersion before taking a position.`;
  }

  if (p.includes('regime') || p.includes('hmm') || p.includes('markov') || p.includes('market state')) {
    return `### Hidden Markov Model (HMM) Market Regimes 📊

Financial markets transition between distinct underlying macroeconomic regimes:

1. **State 0: Low Volatility / Bullish**
   - Steady directional trend, tight Bollinger Bands, positive momentum.
   - Conformal intervals contract; trend-following signals exhibit highest fidelity.
2. **State 1: High Volatility / Bearish**
   - Turbulent return swings, widened spreads, elevated downside tail risk.
   - Model automatically expands risk intervals and dampens aggressive leverage.

The system calculates transition probabilities ($P(\\text{Bull} \\to \\text{Bull})$, $P(\\text{Bear} \\to \\text{Bear})$) in real time and feeds regime state embeddings directly into the XGBoost price forecasting model.`;
  }

  if (p.includes('drift') || p.includes('kolmogorov') || p.includes('ks') || p.includes('distribution')) {
    return `### Kolmogorov-Smirnov (KS) Concept Drift Monitoring ⚡

Financial time-series data is non-stationary—patterns that worked in historical backtests can degrade when macro policy shifts.

- **Two-Sample KS Test**: We continuously evaluate the two-sample Kolmogorov-Smirnov test (\`scipy.stats.ks_2samp\`) comparing historical training distributions with the live 30-day inference window.
- **Statistical Significance ($p < 0.05$)**: When empirical CDF divergence exceeds critical values, an automated **Distribution Drift Alert** is triggered.
- **Safety Fallback**: Upon drift detection, conformal intervals automatically expand by a calibrated multiplier to safeguard against overfitting.`;
  }

  if (p.includes('finbert') || p.includes('sentiment') || p.includes('news') || p.includes('fact')) {
    return `### FinBERT Tone & News Fact Verification 📰

AlphaQuant AI fuses quantitative market tape with NLP news intelligence:

1. **FinBERT Tone Polarity**: Uses Hugging Face's domain-specific financial language model (\`yiyanghkust/finbert-tone\`) to categorize headlines into discrete probabilities for Positive, Negative, and Neutral sentiment.
2. **Fact Verification & Credibility Engine**: Cross-references claims against verified sources (Reuters, Bloomberg, NSE filings, SEC disclosures) and applies publisher reputation weighting.
3. **Multimodal Fusion**: High-credibility positive disclosures reinforce upward price targets, while rumors without verified regulatory filings receive downweighted impact scores.`;
  }

  if (p.includes('watchlist') || p.includes('wishlist') || p.includes('favorite') || p.includes('add stock')) {
    return `### Managing Your Custom Watchlist 📑

You can monitor your favorite assets in one unified terminal matrix:

1. **Navigation**: Click **"Watchlist"** in the top navigation or sidebar (requires login/signup).
2. **Add Tickers**: Use the quick add input (e.g., \`RELIANCE.NS\`, \`TCS.NS\`, \`NVDA\`, \`AAPL\`).
3. **Intelligence Matrix**: Each card displays:
   - Live mark-to-market quote & daily percentage change
   - 90% Conformal price envelope [Lower Bound — Upper Bound]
   - Active HMM market regime state
   - FinBERT tone polarity score
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

- **Indian Equities (NSE)**: \`RELIANCE.NS\`, \`TCS.NS\`, \`INFY.NS\`, \`HDFCBANK.NS\`, \`ICICIBANK.NS\`, \`TATAMOTORS.NS\`, \`BHARTIARTL.NS\`, \`WIPRO.NS\`
- **US Equities (NASDAQ / NYSE)**: \`NVDA\`, \`AAPL\`, \`MSFT\`, \`GOOGL\`, \`AMZN\`, \`TSLA\`, \`META\`
- **Macro Benchmarks**: Nifty 50, Sensex, S&P 500, Nasdaq 100, and India VIX.

Use the search bar in the top navigation to inspect any ticker with one click.`;
  }

  if (p.includes('advice') || p.includes('guarantee') || p.includes('disclaimer') || p.includes('safe') || p.includes('risk')) {
    return `### Model Uncertainty & Regulatory Disclaimer 🛡️

**Statistical Models ≠ Financial Guarantees**

AlphaQuant AI is engineered for quantitative research, backtesting, and educational analysis.
- Machine-learning forecasts, conformal prediction envelopes, and sentiment scores represent historical statistical associations.
- They do **not** constitute financial, investment, legal, or tax advice.
- Markets carry intrinsic systemic risk, and past performance does not guarantee future financial results. Always conduct independent due diligence.`;
  }

  if (p.includes('dark') || p.includes('light') || p.includes('theme') || p.includes('mode')) {
    return `### Theme Preferences (Dark & Light Mode) ☀️🌙

AlphaQuant AI supports both institutional themes:
- **Dark Mode**: Sleek, high-contrast slate-950 aesthetic optimized for trading environments.
- **Light Mode**: Crisp, clean light background with refined typography for bright workspaces.

Click the **Sun ☀️ / Moon 🌙 button** in the top navigation bar at any time to toggle themes. Your preference is saved automatically in your browser.`;
  }

  if (p.includes('profile') || p.includes('setting') || p.includes('password') || p.includes('2fa') || p.includes('avatar')) {
    return `### Profile & Account Settings 👤⚙️

Click on your **Profile icon** in the top-right corner to open the profile dropdown or full settings workspace:

1. **Profile & Personal Details**: Update your display name, professional role/title, organization, contact phone, and timezone.
2. **Platform Preferences**: Select default currency (₹ INR / $ USD), primary exchange (NSE / NASDAQ), and custom Conformal Prediction confidence levels (80%, 90%, 95%).
3. **Security & Password**: Change your password and toggle **Two-Factor Authentication (2FA)** for portfolio protection.
4. **Notifications & Alarms**: Configure automatic alerts for regime shifts, concept drift, and morning pre-market briefs.
5. **Data Audit**: Review your logged forecasts history, export account data to JSON, and manage saved data.`;
  }

  // General assistant response
  return `### Hello! I'm the AlphaQuant AI Assistant 🤖

I'm here to help you get the most out of the AlphaQuant AI Stock Intelligence Platform. Here are key things I can assist you with:

- **Platform Navigation**: How to sign up, log in, view the Dashboard, or manage your Watchlist & Portfolio.
- **Quantitative Models**: How **90% Conformal Prediction**, **HMM Market Regimes**, and **FinBERT News Fusion** work.
- **Data & Drift**: Understanding Kolmogorov-Smirnov drift tests and model safety.
- **Supported Tickers**: Searching NSE stocks (\`RELIANCE.NS\`, \`TCS.NS\`, etc.) and US equities (\`NVDA\`, \`AAPL\`, etc.).

*What would you like to explore today?*`;
}
