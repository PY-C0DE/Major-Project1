/**
 * Shared model configuration constants used consistently across
 * server inference/evaluation and frontend UI components.
 */

export const DEFAULT_CONFORMAL_CONFIDENCE = 0.90;
export const DEFAULT_CONFORMAL_COVERAGE_PCT = 90;
export const CONFORMAL_CONFIDENCE_LEVELS = [0.80, 0.90, 0.95, 0.99] as const;
export const CONFORMAL_COVERAGE_PCT_LEVELS = [80, 90, 95, 99] as const;

export const DEFAULT_BACKTEST_STRATEGY = 'ensemble_conformal' as const;
export type AutomatedBacktestStrategyId =
  | 'ensemble_conformal'
  | 'conformal_breakout'
  | 'regime_adaptive';
