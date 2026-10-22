/**
 * AlphaBot Quantitative Knowledge Base & Domain Fallback Engine
 * Provides rich, accurate mathematical and operational answers for terminal users.
 */

export function generateQuantCopilotAnswer(query: string, ticker = 'General'): string {
  const q = query.toLowerCase();

  if (q.includes('conformal') || q.includes('coverage') || q.includes('interval') || q.includes('guarantee')) {
    return `### Split-Conformal Prediction Envelopes (USP 1)

In AlphaQuant AI, uncertainty is quantified using **finite-sample split-conformal inference**:

$$\\hat{C}(X_{n+1}) = [\\hat{y}_{n+1} - \\hat{q}_{1-\\alpha}, \\; \\hat{y}_{n+1} + \\hat{q}_{1-\\alpha}]$$

**Key Mathematical Properties:**
1. **Distribution-Free Guarantee**: Holds for any underlying distribution without assuming Gaussianity or normality.
2. **Nominal Coverage**: At confidence level $1 - \\alpha = 90\\%$, exactly $90\\%$ of future closing prices are mathematically guaranteed to land inside the band under exchangeability.
3. **Dynamic Calibration**: Residuals $R_i = |y_i - \\hat{y}_i|$ are computed chronologically on the holdout calibration window.
4. **Regime Scaling**: When volatility spikes in **Regime 1**, the conformal envelope automatically expands by the regime variance multiplier to maintain coverage guarantees.`;
  }

  if (q.includes('greek') || q.includes('delta') || q.includes('gamma') || q.includes('theta') || q.includes('vega') || q.includes('option')) {
    return `### Real-Time Black-Scholes Greeks Analytics

AlphaQuant's **Options & Greeks** terminal calculates continuous Black-Scholes partial derivatives:

- **Delta ($\\Delta$)**: Rate of change of option price per \\$1 move in spot (Call: $N(d_1) \\in [0, 1]$, Put: $N(d_1) - 1 \\in [-1, 0]$).
- **Gamma ($\\Gamma$)**: Curvature of Delta: $\\Gamma = \\frac{N'(d_1)}{S \\sigma \\sqrt{T}}$. Peaks at At-The-Money (ATM).
- **Theta ($\\Theta$)**: Daily time decay: captures the erosion of extrinsic option premium as expiration approaches.
- **Vega ($\\nu$)**: Sensitivity to a $1\\%$ change in Implied Volatility: $\\nu = \\frac{S \\sqrt{T} N'(d_1)}{100}$.
- **Expected Move**: $\\pm \\text{Move} = S \\times \\text{ATM IV} \\times \\sqrt{T / 365}$.

Open the **Options & Greeks** modal in the top navigation to view the live strike matrix and IV smile!`;
  }

  if (q.includes('drift') || q.includes('kolmogorov') || q.includes('ks') || q.includes('test')) {
    return `### Two-Sample Kolmogorov-Smirnov Concept Drift Test (USP 4)

Concept drift is monitored by comparing the cumulative empirical distribution functions of baseline training features against live 30-day inference distributions:

$$D = \\sup_{x} |F_{\\text{baseline}}(x) - F_{\\text{live}}(x)|$$

- **Threshold**: When the asymptotic $p$-value falls below $0.05$ with $D > 0.15$, a **Concept Drift Alert** is triggered.
- **Safety Auto-Widening**: Conformal prediction intervals are automatically expanded by up to $30\\%$ to prevent under-coverage while the model re-calibrates.`;
  }

  if (q.includes('sharpe') || q.includes('optimizer') || q.includes('markowitz') || q.includes('mvo') || q.includes('portfolio')) {
    return `### Markowitz Mean-Variance Portfolio Optimization & Sync

The **AI Portfolio Optimizer** solves for the optimal asset allocation vector $\\mathbf{w}^*$:

$$\\max_{\\mathbf{w}} \\frac{\\mathbf{w}^T \\boldsymbol{\\mu} - R_f}{\\sqrt{\\mathbf{w}^T \\boldsymbol{\\Sigma} \\mathbf{w}}} \\quad \\text{subject to } \\sum w_i = 1, \\; 0.04 \\le w_i \\le 0.55$$

- **Tangency Portfolio**: Maximizes the Sharpe Ratio along the Markowitz Efficient Frontier.
- **Singular Covariance Protection**: If fewer than 2 assets are held or $\\boldsymbol{\\Sigma}$ is singular, the system gracefully defaults to equal weighting ($1/N$) rather than failing.
- **1-Click Portfolio Sync**: Click **Portfolio Sync** in the top navigation to compute optimal weights and synchronize rebalancing orders instantly!`;
  }

  if (q.includes('broker') || q.includes('alpaca') || q.includes('order') || q.includes('paper') || q.includes('trade')) {
    return `### Direct Broker Router & Alpaca Paper Gateway

AlphaQuant features a high-speed **Direct Broker Router** connected to the Alpaca Paper Trading API:

- **Order Routing**: Execute Market and Limit orders with zero commission slippage simulation.
- **Advanced Risk Management**:
  - **Stop-Loss Protection**: Automatically trigger protective market exits if price breaches your downside floor.
  - **Profit Target Ceilings**: Lock in gains automatically when target upside valuation is achieved.
- **Access**: Click **Broker Router** in the top navigation bar to open the execution terminal.`;
  }

  if (q.includes('indicator') || q.includes('custom') || q.includes('strategy') || q.includes('backtest')) {
    return `### Recommended Custom Quantitative Indicators & Backtesting

For market conditions surrounding **${ticker}**, consider combining:
1. **Conformal Volatility Ratio (CVR)**: $\\text{CVR} = \\frac{\\text{Upper Band} - \\text{Lower Band}}{\\text{ATR}(14)}$. When CVR compresses below $1.2$, a volatility expansion is imminent.
2. **Regime Momentum Oscillator (RMO)**: Weight standard MACD histogram by the state persistence probability of HMM Regime 0.
3. **Asymmetric Tail Ratio**: Measure upside variance versus downside semi-variance.

Click **Backtest** in the top navigation to test this strategy against Buy-and-Hold over trailing 90-day and 252-day sessions!`;
  }

  return `### AlphaQuant AI Assistant

Welcome to the AlphaQuant AI Terminal! Here are key areas I can assist you with:
- **Price Accuracy**: View project-wide $100\\% - \\text{MAPE}$ evaluation on the main Dashboard.
- **Options & Greeks**: Analyze real-time Black-Scholes Greeks ($\\Delta, \\Gamma, \\Theta, \\nu$), IV smiles, and strike chains.
- **Automated Backtesting**: Compare model outperformance against Buy-and-Hold benchmarks with historical equity curves.
- **Direct Broker Router**: Execute paper orders with stop-loss and profit target ceilings via Alpaca.
- **Social & Copy-Trade**: Monitor community sentiment and replicate verified institutional portfolios.
- **AI Portfolio Optimizer**: Rebalance your multi-asset basket along the Markowitz Efficient Frontier.

How would you like to proceed?`;
}
