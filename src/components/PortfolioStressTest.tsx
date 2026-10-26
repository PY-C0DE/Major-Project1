import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  TrendingDown, 
  Flame, 
  Sliders, 
  ShieldCheck, 
  ArrowDownRight, 
  Info, 
  Zap, 
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { PortfolioHolding, StressTestScenario, StressTestResult } from '../types';

interface PortfolioStressTestProps {
  holdings: PortfolioHolding[];
  portfolioTotalValue: number;
}

const HISTORICAL_SCENARIOS: StressTestScenario[] = [
  {
    id: 'gfc_2008',
    name: '2008 Global Financial Crisis',
    historicalPeriod: 'Sep 2008 - Mar 2009',
    description: 'Lehman collapse trigger, systemic banking liquidity freeze, massive deleveraging across global equities.',
    marketDropPct: -46.5,
    volatilitySpikePct: 180,
    techDropPct: -42.0,
    financialsDropPct: -68.0,
    energyDropPct: -51.0,
    defensiveDropPct: -18.0,
    interestRateBps: -400,
  },
  {
    id: 'covid_2020',
    name: '2020 COVID-19 Flash Liquidity Shock',
    historicalPeriod: 'Feb 2020 - Mar 2020',
    description: 'Fastest 30% drop in market history, VIX hit 82, widespread lockdowns, sudden supply chain halt.',
    marketDropPct: -33.8,
    volatilitySpikePct: 240,
    techDropPct: -27.5,
    financialsDropPct: -43.0,
    energyDropPct: -58.0,
    defensiveDropPct: -14.5,
    interestRateBps: -150,
  },
  {
    id: 'dotcom_2000',
    name: '2000 Dot-Com Tech Bubble Burst',
    historicalPeriod: 'Mar 2000 - Oct 2002',
    description: 'Unprofitable speculative tech crash, extreme multiple compression, Nasdaq collapsed 78%.',
    marketDropPct: -44.0,
    volatilitySpikePct: 120,
    techDropPct: -76.0,
    financialsDropPct: -22.0,
    energyDropPct: -15.0,
    defensiveDropPct: -8.0,
    interestRateBps: -250,
  },
  {
    id: 'stagflation_2022',
    name: '2022 Rapid Rate Shock & Stagflation',
    historicalPeriod: 'Jan 2022 - Oct 2022',
    description: 'Aggressive central bank rate hikes (500bps) battling 40-year high inflation; growth & tech compressed.',
    marketDropPct: -24.5,
    volatilitySpikePct: 85,
    techDropPct: -36.0,
    financialsDropPct: -16.0,
    energyDropPct: 35.0, // Energy outperformed
    defensiveDropPct: -7.5,
    interestRateBps: 450,
  },
  {
    id: 'geopolitical_oil',
    name: 'Geopolitical Conflict & Supply Blockade',
    historicalPeriod: 'Hypothetical Black Swan',
    description: 'Strait of Hormuz closure / regional warfare, Brent crude surges >$140/bbl, global supply chain stagflation.',
    marketDropPct: -19.5,
    volatilitySpikePct: 110,
    techDropPct: -23.0,
    financialsDropPct: -18.5,
    energyDropPct: 42.0,
    defensiveDropPct: -4.0,
    interestRateBps: 100,
  },
];

// Helper to deduce sector or assign realistic beta
function inferSectorAndBeta(ticker: string): { sector: string; beta: number } {
  const t = ticker.toUpperCase();
  if (t.includes('RELIANCE') || t.includes('XOM') || t.includes('CVX') || t.includes('BP') || t.includes('ONGC')) {
    return { sector: 'Energy & Commodities', beta: 1.15 };
  }
  if (t.includes('TCS') || t.includes('INFY') || t.includes('AAPL') || t.includes('MSFT') || t.includes('NVDA') || t.includes('GOOGL') || t.includes('TSLA') || t.includes('WIPRO')) {
    return { sector: 'Technology & Growth', beta: 1.35 };
  }
  if (t.includes('HDFC') || t.includes('ICICI') || t.includes('SBIN') || t.includes('JPM') || t.includes('BAC') || t.includes('KOTAK')) {
    return { sector: 'Banking & Financials', beta: 1.25 };
  }
  if (t.includes('HINDUNILVR') || t.includes('ITC') || t.includes('PG') || t.includes('KO') || t.includes('NESTLE')) {
    return { sector: 'Defensive FMCG / Consumer', beta: 0.65 };
  }
  if (t.includes('SUNPHARMA') || t.includes('JNJ') || t.includes('PFE') || t.includes('DRREDDY')) {
    return { sector: 'Healthcare & Pharma', beta: 0.72 };
  }
  return { sector: 'Diversified Large-Cap', beta: 1.05 };
}

export const PortfolioStressTest: React.FC<PortfolioStressTestProps> = ({ holdings, portfolioTotalValue }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('gfc_2008');
  const [customMarketShock, setCustomMarketShock] = useState<number>(-30);
  const [customTechShock, setCustomTechShock] = useState<number>(-40);
  const [customVolatilitySpike, setCustomVolatilitySpike] = useState<number>(150);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const activeScenario = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'custom_scenario',
        name: 'Custom Tail-Risk Simulation',
        historicalPeriod: 'Interactive Parameters',
        description: 'User-configured bespoke market stress test scenario for extreme tail-risk evaluation.',
        marketDropPct: customMarketShock,
        volatilitySpikePct: customVolatilitySpike,
        techDropPct: customTechShock,
        financialsDropPct: customMarketShock * 1.25,
        energyDropPct: customMarketShock * 0.9,
        defensiveDropPct: customMarketShock * 0.45,
        interestRateBps: 200,
      };
    }
    return HISTORICAL_SCENARIOS.find(s => s.id === selectedScenarioId) || HISTORICAL_SCENARIOS[0];
  }, [isCustomMode, selectedScenarioId, customMarketShock, customTechShock, customVolatilitySpike]);

  // Compute stress test impacts on holdings
  const stressResults: StressTestResult = useMemo(() => {
    const totalVal = portfolioTotalValue > 0 ? portfolioTotalValue : 
      holdings.reduce((sum, h) => sum + (h.currentValue || (h.quantity * h.currentPrice)), 0);

    const assetImpacts = holdings.map(h => {
      const hVal = h.currentValue || (h.quantity * h.currentPrice);
      const { sector, beta } = inferSectorAndBeta(h.ticker);
      
      // Calculate sector-adjusted shock percentage
      let sectorFactor = activeScenario.marketDropPct;
      if (sector.includes('Tech')) sectorFactor = activeScenario.techDropPct;
      else if (sector.includes('Bank') || sector.includes('Financial')) sectorFactor = activeScenario.financialsDropPct;
      else if (sector.includes('Energy')) sectorFactor = activeScenario.energyDropPct;
      else if (sector.includes('Defensive') || sector.includes('Health')) sectorFactor = activeScenario.defensiveDropPct;

      // Adjust for individual beta
      const shockPct = Math.min(60, Math.max(-95, sectorFactor * (0.6 + 0.4 * beta)));
      const projectedVal = Math.max(0, hVal * (1 + shockPct / 100));
      const shockDollar = projectedVal - hVal;

      let vulnerabilityLevel: 'Low' | 'Moderate' | 'Severe' = 'Moderate';
      if (Math.abs(shockPct) < 18) vulnerabilityLevel = 'Low';
      else if (Math.abs(shockPct) >= 35) vulnerabilityLevel = 'Severe';

      return {
        ticker: h.ticker,
        companyName: h.companyName || h.ticker,
        currentValue: hVal,
        projectedValue: projectedVal,
        shockDollar,
        shockPct,
        beta,
        sector,
        vulnerabilityLevel,
      };
    });

    const projectedPortfolioValue = assetImpacts.reduce((sum, a) => sum + a.projectedValue, 0);
    const projectedLossDollar = projectedPortfolioValue - totalVal;
    const projectedLossPct = totalVal > 0 ? (projectedLossDollar / totalVal) * 100 : 0;

    // Parametric Value at Risk (VaR) estimations
    // 95% 1-day/event VaR ~ 1.65 * sigma, 99% VaR ~ 2.33 * sigma
    const estimatedDailyVol = (Math.abs(activeScenario.marketDropPct) / 100) * (1 + activeScenario.volatilitySpikePct / 200) * 0.12;
    const var95Dollar = totalVal * Math.min(0.65, estimatedDailyVol * 1.645);
    const var99Dollar = totalVal * Math.min(0.85, estimatedDailyVol * 2.326);
    const maxDrawdownProjectedPct = Math.abs(projectedLossPct) * 1.15;

    // Actionable Risk Mitigations
    const riskMitigations = [
      {
        category: 'Hedging with Put Options',
        recommendation: `Buy out-of-the-money Index Puts (Delta 0.25) covering $${Math.round(totalVal * 0.8).toLocaleString()} notional.`,
        expectedProtectionDollar: Math.abs(projectedLossDollar) * 0.55,
      },
      {
        category: 'Defensive Allocation Shift',
        recommendation: 'Reallocate 15% to 20% of high-beta tech exposure into Sovereign Gold Bonds & Short-Duration Treasuries.',
        expectedProtectionDollar: Math.abs(projectedLossDollar) * 0.28,
      },
      {
        category: 'Automated Stop-Loss Rules',
        recommendation: 'Enforce trailing stop-losses at 8.5% below current mark to truncate severe tail-risk.',
        expectedProtectionDollar: Math.abs(projectedLossDollar) * 0.42,
      },
    ];

    return {
      scenarioName: activeScenario.name,
      marketShockPct: activeScenario.marketDropPct,
      initialPortfolioValue: totalVal,
      projectedPortfolioValue,
      projectedLossDollar,
      projectedLossPct,
      var95Dollar,
      var99Dollar,
      maxDrawdownProjectedPct,
      assetImpacts,
      riskMitigations,
    };
  }, [holdings, portfolioTotalValue, activeScenario]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Portfolio Stress Testing & Tail-Risk Engine
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
              Black Swan Simulation
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Simulate acute macroeconomic shocks and black-swan crashes to evaluate holding-level vulnerability and expected drawdowns.
          </p>
        </div>

        {/* Toggle Preset vs Custom */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setIsCustomMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              !isCustomMode 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Historical Presets
          </button>
          <button
            onClick={() => setIsCustomMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              isCustomMode 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Custom Stress
          </button>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      {!isCustomMode ? (
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Select Historical Black Swan Crisis
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HISTORICAL_SCENARIOS.map(sc => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/80 ring-2 ring-rose-500/20 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {sc.name}
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {sc.marketDropPct}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                    {sc.description}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>{sc.historicalPeriod}</span>
                    <span>VIX: +{sc.volatilitySpikePct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Custom Shock Sliders */
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              Configure Bespoke Macro Shock Parameters
            </h4>
            <button
              onClick={() => {
                setCustomMarketShock(-30);
                setCustomTechShock(-40);
                setCustomVolatilitySpike(150);
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Broad Market Shock</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{customMarketShock}%</span>
              </div>
              <input
                type="range"
                min="-70"
                max="-5"
                step="1"
                value={customMarketShock}
                onChange={e => setCustomMarketShock(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Mild (-5%)</span>
                <span>Catastrophic (-70%)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Tech Sector Compression</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{customTechShock}%</span>
              </div>
              <input
                type="range"
                min="-85"
                max="-5"
                step="1"
                value={customTechShock}
                onChange={e => setCustomTechShock(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-5%</span>
                <span>-85%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Volatility / VIX Spike</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+{customVolatilitySpike}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="5"
                value={customVolatilitySpike}
                onChange={e => setCustomVolatilitySpike(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>+20%</span>
                <span>+300%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Impact Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pre-Stress Portfolio Value</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            ${stressResults.initialPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Current unhedged mark-to-market</div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
          <div className="text-xs text-rose-700 dark:text-rose-300 font-medium mb-1">Projected Stressed Value</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            ${stressResults.projectedPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 mt-1 font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>${Math.abs(stressResults.projectedLossDollar).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({stressResults.projectedLossPct.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">95% Value at Risk (VaR)</div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            ${Math.round(stressResults.var95Dollar).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            99% Tail VaR: <span className="font-mono text-slate-700 dark:text-slate-300">${Math.round(stressResults.var99Dollar).toLocaleString()}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Max Projected Drawdown</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            -{stressResults.maxDrawdownProjectedPct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Peak-to-trough estimated risk</div>
        </div>
      </div>

      {/* Asset-by-Asset Vulnerability Breakdown */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Asset-by-Asset Impact Breakdown ({stressResults.assetImpacts.length} Positions)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Adjusted for Beta & Sector Sensitivity
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Asset / Ticker</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4 text-center">Beta</th>
                <th className="py-3 px-4 text-right">Current Value</th>
                <th className="py-3 px-4 text-right">Projected Value</th>
                <th className="py-3 px-4 text-right">Projected Shock</th>
                <th className="py-3 px-4 text-center">Vulnerability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {stressResults.assetImpacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No holdings in portfolio to stress test. Add holdings to see simulated impacts.
                  </td>
                </tr>
              ) : (
                stressResults.assetImpacts.map((item) => (
                  <tr key={item.ticker} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.ticker}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{item.companyName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.sector}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      {item.beta.toFixed(2)}x
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">
                      ${item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">
                      ${item.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-mono font-bold ${
                        item.shockPct < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.shockPct > 0 ? '+' : ''}{item.shockPct.toFixed(1)}%
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.shockDollar < 0 ? '-' : '+'}${Math.abs(item.shockDollar).toFixed(0)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.vulnerabilityLevel === 'Severe'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          : item.vulnerabilityLevel === 'Moderate'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {item.vulnerabilityLevel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actionable Risk Mitigations */}
      <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Recommended Portfolio Hedging & Tail-Risk Mitigations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stressResults.riskMitigations.map((mitigation, idx) => (
            <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                  {mitigation.category}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  +${Math.round(mitigation.expectedProtectionDollar).toLocaleString()} Save
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {mitigation.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default PortfolioStressTest;
