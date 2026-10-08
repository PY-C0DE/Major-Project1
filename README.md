# AlphaQuant AI — Enterprise Stock Intelligence Platform

An institutional-grade, full-stack AI financial intelligence platform engineered for quantitative price forecasting, uncertainty quantification, macroeconomic regime discovery, and real-time concept drift monitoring.

---

## 1. Core Architecture & Differentiating Innovations (USPs)

### USP 1 — Conformal Prediction (MAPIE & Split-Conformal)
Rather than predicting a single deterministic point target, AlphaQuant provides a **90% finite-sample prediction interval**:
$$\hat{C}(X_{n+1}) = [\hat{y}_{n+1} - \hat{q}_{1-\alpha}, \; \hat{y}_{n+1} + \hat{q}_{1-\alpha}]$$
- Quantifies epistemic and aleatoric market risk.
- Residual non-conformity calibration over time-series validation windows.
- Clear user guidance: Prediction intervals represent mathematical bounds of uncertainty and are not market guarantees.

### USP 2 — Hidden Markov Model (HMM) Market Regime Detection
- Uses Gaussian HMMs (`hmmlearn`) over daily log-returns $r_t$ and rolling volatility $\sigma_{20d}$.
- Identifies latent market phases:
  - **Regime 0**: Low Volatility / Bullish steady drift
  - **Regime 1**: High Volatility / Bearish tail risk
- Computes empirical transition matrix $A$, posterior state probabilities, and regime stability indices.
- Passes the active regime into downstream prediction models as a conditioned feature.

### USP 3 — Multimodal Signal Fusion & FinBERT Tone Analysis
- **Technical Factors**: SMA, EMA, RSI (Wilder's 14), MACD, Bollinger Bands, ATR, Momentum, ROC.
- **FinBERT NLP**: Fine-tuned on financial discourse (`yiyanghkust/finbert-tone`) to extract positive, neutral, and negative sentiment probabilities and composite polarity.
- **Fake-News & Fact Verification**: Google Fact Check Tools API claim matching coupled with publisher domain credibility scoring.

### USP 4 — Concept Drift Monitoring (Kolmogorov-Smirnov Test)
- Continuous two-sample Kolmogorov-Smirnov test (`scipy.stats.ks_2samp`) comparing baseline training distributions against live 30-day inference windows.
- Calculates empirical $D$-statistics and asymptotic $p$-values across all key features.
- Triggers automatic safety warnings and widens prediction envelopes when distribution drift is detected ($p < 0.05$).

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Recharts, Lucide Icons
- **Full-Stack Runtime**: Express + Node.js (Vite middleware integration), Python 3.10+ FastAPI backend
- **Machine Learning & Math**: XGBoost, Scikit-Learn, HMMlearn, Scipy, Pandas, MAPIE Conformal Prediction
- **NLP**: Hugging Face Transformers, FinBERT tone architecture
- **Database**: MongoDB with automatic in-memory cache resilience
- **Authentication**: JWT token verification, salted bcrypt password hashing

---

## 3. Quick Start (Local Development)

### Full-Stack Run (Instant UI + Live Financial APIs on port 3000)
```bash
# 1. Install dependencies
npm install #or npm install --legacy-peer-deps

# 2. Run full-stack dev server
npm run dev

""" If a Vite React-Is error occurs
npm install react-is --force
npx vite --force"""

""" If you have Bun installed, you can simply run:
bun install
bun run dev"""
```
Open **http://localhost:3000** in your browser.

### Python Backend Run (Optional standalone FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
uvicorn backend.app.main:app --reload --port 8000
```
Swagger API docs: **http://localhost:8000/docs**

### Docker Deployment
```bash
docker-compose up --build
```

---

## 4. Financial & Safety Disclaimer
*AlphaQuant AI is designed strictly for research, educational, and informational purposes. Machine-learning models, conformal intervals, and sentiment scores are subject to market volatility and uncertainty. Past model accuracy does not guarantee future financial returns. This platform does not provide licensed investment, financial, or trading advice.*


.env file
# Environment Configuration for AI Stock Intelligence Platform

# Server & Runtime
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb+srv://gaurigupta1016_db_user:<m8euvlIgRMRxJJv>@cluster0.scs3ggo.mongodb.net/?appName=Cluster0
DATABASE_NAME=ai_stock_intelligence

# Security & Authentication
JWT_SECRET=b2c7e4693c4a2544350fc473f8b465f8cb711b31b66f99c115386d47914dc41541998d66e49ce9e93572eb1052614e0a282377cf4640c66ed003eee26b5471a5
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# External Financial Data APIs (Optional / Enhanced)
# System works out of the box with built-in Yahoo Finance engine and demo fallbacks
NEWS_API_KEY=pub_762d2d753cb64c08990fab04c2237b61
FRED_API_KEY=ba44f8ac56466d42be4e76f45784d3ee
GOOGLE_FACT_CHECK_API_KEY=AIzaSyCB_eF1dk404BhFrMLtbE1gYlAmRv78a6Y
ALPHA_VANTAGE_API_KEY=43FMA88PD7QYKC6P

# Model Configuration
CONFIDENCE_LEVEL=0.90
REGIME_COMPONENTS=2
DRIFT_P_VALUE_THRESHOLD=0.05
RANDOM_SEED=42
