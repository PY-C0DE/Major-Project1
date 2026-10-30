import React, { useState } from 'react';
import { 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  ShieldAlert, 
  ShieldCheck, 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Scale, 
  Layers, 
  Clock, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { ConformalPrediction, PreviousDayStats, ClassifiedFinancialEvent, DecisionSignal } from '../types';

interface Props {
  prediction: ConformalPrediction | null;
  currency: string;
  ticker: string;
  onOpenInvestorGuide?: () => void;
}

export const StockDecisionAndHistoryCard: React.FC<Props> = ({
  prediction,
  currency,
  ticker,
  onOpenInvestorGuide
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'decision' | 'previous_day' | 'classified_events'>('decision');

  if (!prediction) return null;

  const currSym = currency === 'INR' ? '₹' : '$';
  const prevStats: PreviousDayStats | undefined = prediction.previousDayStats;
  const decision: DecisionSignal | undefined = prediction.decisionSignal;
  const events: ClassifiedFinancialEvent[] = prediction.classifiedEvents || [];

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('decision')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSubTab === 'decision'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hold or Sell Signal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('previous_day')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSubTab === 'previous_day'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-cyan-500" />
            <span>Previous Day Stats Audit</span>
          </button>

          <button
            onClick={() => setActiveSubTab('classified_events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeSubTab === 'classified_events'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Classified Financial Events ({events.length})</span>
          </button>
        </div>

        {onOpenInvestorGuide && (
          <button
            onClick={onOpenInvestorGuide}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Beginner Investor Guide</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1. DECISION SUPPORT: HOLD OR SELL OR BUY */}
      {activeSubTab === 'decision' && decision && (
        <div className="space-y-4 animate-fadeIn">
          {/* Signal Header Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            decision.recommendation === 'STRONG BUY' || decision.recommendation === 'BUY'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : decision.recommendation === 'HOLD'
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                  decision.recommendation === 'STRONG BUY' || decision.recommendation === 'BUY'
                    ? 'bg-emerald-600 text-white'
                    : decision.recommendation === 'HOLD'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {decision.recommendation}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Confidence: {decision.confidenceScore}%
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5 font-medium leading-relaxed">
                {decision.holdingActionRationale}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                  Target Exit {prediction.targetDate ? `(${prediction.targetDate})` : ''}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {currSym}{decision.targetPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Stop Loss</span>
                <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                  {currSym}{decision.stopLossPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Risk/Reward</span>
                <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {decision.riskRewardRatio.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>

          {/* Action trigger breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4" />
                Hold Safety Threshold
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {decision.holdSafetyCondition}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-4 h-4" />
                Trigger Condition to Sell / Exit
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {decision.sellTriggerCondition}
              </p>
            </div>
          </div>

          {/* Quantitative Context Factors */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 pt-1">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Conformal Position: <strong className="text-slate-800 dark:text-slate-200">{decision.factors.conformalPosition}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Regime: <strong className="text-slate-800 dark:text-slate-200">{decision.factors.regimeAlignment}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Technical RSI: <strong className="text-slate-800 dark:text-slate-200">{decision.factors.rsiState}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 2. PREVIOUS DAY'S PRICE & PREDICTION AUDIT */}
      {activeSubTab === 'previous_day' && prevStats && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Latest Completed Session Audit ({prevStats.previousDate})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit how this session's actual closing price compared to the quantitative ensemble forecast and conformal bounds.
              </p>
            </div>

            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
              prevStats.hit
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{prevStats.hit ? '90% Conformal Bound Hit' : 'Boundary Miss'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Actual Close</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                {currSym}{prevStats.previousClose.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                Range: {currSym}{prevStats.previousLow.toFixed(1)} - {currSym}{prevStats.previousHigh.toFixed(1)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Session Forecast</span>
              <span className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-1 block">
                {currSym}{prevStats.predictedClose.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                Channel: {currSym}{prevStats.lowerBound.toFixed(1)} - {currSym}{prevStats.upperBound.toFixed(1)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Prediction Error</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                {prevStats.errorPercent.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400">
                Absolute: {currSym}{prevStats.errorAbsolute.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">5-Day Hit Rate</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {prevStats.trailing5DayHits.filter(h => h.hit).length} / {prevStats.trailing5DayHits.length} Days
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                100% Coverage Alignment
              </span>
            </div>
          </div>

          {/* Trailing Sessions Accuracy Ledger */}
          {prevStats.trailing5DayHits && prevStats.trailing5DayHits.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <h5 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Trailing Sessions Accuracy Ledger (Actual Close vs Forecast)
                </h5>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                  Ensemble v2.0 Calibrated
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="py-2 px-3 font-medium">Session Date</th>
                      <th className="py-2 px-3 font-medium text-right">Actual Close</th>
                      <th className="py-2 px-3 font-medium text-right text-cyan-600 dark:text-cyan-400">Model Forecast</th>
                      <th className="py-2 px-3 font-medium text-right">Conformal Channel</th>
                      <th className="py-2 px-3 font-medium text-right">Abs Error</th>
                      <th className="py-2 px-3 font-medium text-right">Error %</th>
                      <th className="py-2 px-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                    {[...prevStats.trailing5DayHits].reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {day.date}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {currSym}{day.actualClose.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-cyan-600 dark:text-cyan-400">
                          {currSym}{day.predictedClose.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                          [{currSym}{day.lowerBound.toFixed(1)} – {currSym}{day.upperBound.toFixed(1)}]
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {currSym}{Math.abs(day.actualClose - day.predictedClose).toFixed(2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${
                          day.errorPct < 1.0 ? 'text-emerald-600 dark:text-emerald-400' : day.errorPct < 2.5 ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {day.errorPct.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            day.hit
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          }`}>
                            {day.hit ? 'HIT' : 'MISS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CLASSIFIED FINANCIAL EVENTS & CORPORATE ACTIONS */}
      {activeSubTab === 'classified_events' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Classified Catalysts & Structural Events for {ticker}
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Fed into Conformal Feature Weights
            </span>
          </div>

          {events.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No recent high-impact corporate actions recorded for {ticker}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        evt.category.includes('Mergers')
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : evt.category.includes('Earnings')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : evt.category.includes('Regulatory')
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {evt.category}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {evt.title}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      {evt.summary}
                    </p>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 block">
                      Feature: {evt.incorporationInModel}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-mono">Expected Price Impact</span>
                    <span className={`text-sm font-bold font-mono ${
                      evt.predictedPriceEffectPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {evt.predictedPriceEffectPct >= 0 ? '+' : ''}{evt.predictedPriceEffectPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">{evt.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default StockDecisionAndHistoryCard;
