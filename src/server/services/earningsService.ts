/**
 * Institutional Earnings Calendar Service
 * Provides upcoming earnings dates, consensus EPS estimates, revenue forecasts,
 * analyst coverage, implied options moves, and 4-quarter historical surprise patterns
 * for watchlist stocks and major market equities.
 */

import { EarningsCalendarItem, HistoricalEarningsQuarter } from '../../types';
import { getStockQuote } from './stockService';
import { TICKER_CATALOG } from '../../shared/tickerCatalog';

interface StaticEarningsProfile {
  ticker: string;
  reportDateStr: string; // "2026-11-10", "2026-11-14", etc.
  session: 'BMO' | 'AMC' | 'DURING';
  fiscalPeriod: string;
  isConfirmed: boolean;
  estimatedEPS: number;
  estimatedEPSLow: number;
  estimatedEPSHigh: number;
  yoyEPSGrowthPct: number;
  estimatedRevenue: string;
  yoyRevenueGrowthPct: number;
  analystCount: number;
  impliedStraddleMovePct: number;
  historicalQuarters: HistoricalEarningsQuarter[];
  keyFocusThemes: string[];
}

export const EARNINGS_PROFILES: Record<string, StaticEarningsProfile> = {
  AMD: {
    ticker: 'AMD',
    reportDateStr: '2026-11-10',
    session: 'AMC',
    fiscalPeriod: 'Q3 FY26',
    isConfirmed: true,
    estimatedEPS: 0.92,
    estimatedEPSLow: 0.88,
    estimatedEPSHigh: 0.96,
    yoyEPSGrowthPct: 31.4,
    estimatedRevenue: '$6.80B',
    yoyRevenueGrowthPct: 17.2,
    analystCount: 31,
    impliedStraddleMovePct: 8.2,
    keyFocusThemes: [
      'MI325X & MI350 AI Accelerator Enterprise Shipments',
      'Data Center EPYC Server CPU Share Gains vs x86',
      'Client PC AI Ryzen Refresh ASP Trajectory'
    ],
    historicalQuarters: [
      {
        quarter: 'Q2 FY26',
        date: '2026-07-30',
        estimatedEPS: 0.68,
        actualEPS: 0.69,
        surprisePct: 1.47,
        outcome: 'BEAT',
        revenueEstimated: '$5.72B',
        revenueActual: '$5.83B',
        postEarningsMovePct: 4.4
      },
      {
        quarter: 'Q1 FY26',
        date: '2026-04-30',
        estimatedEPS: 0.62,
        actualEPS: 0.62,
        surprisePct: 0.0,
        outcome: 'INLINE',
        revenueEstimated: '$5.45B',
        revenueActual: '$5.47B',
        postEarningsMovePct: -8.9
      },
      {
        quarter: 'Q4 FY25',
        date: '2026-01-30',
        estimatedEPS: 0.77,
        actualEPS: 0.77,
        surprisePct: 0.0,
        outcome: 'INLINE',
        revenueEstimated: '$6.10B',
        revenueActual: '$6.17B',
        postEarningsMovePct: -2.5
      },
      {
        quarter: 'Q3 FY25',
        date: '2025-10-31',
        estimatedEPS: 0.68,
        actualEPS: 0.70,
        surprisePct: 2.94,
        outcome: 'BEAT',
        revenueEstimated: '$5.70B',
        revenueActual: '$5.80B',
        postEarningsMovePct: 9.7
      }
    ]
  },
  AAPL: {
    ticker: 'AAPL',
    reportDateStr: '2026-11-12',
    session: 'AMC',
    fiscalPeriod: 'Q4 FY26',
    isConfirmed: true,
    estimatedEPS: 1.60,
    estimatedEPSLow: 1.54,
    estimatedEPSHigh: 1.66,
    yoyEPSGrowthPct: 9.6,
    estimatedRevenue: '$94.50B',
    yoyRevenueGrowthPct: 5.6,
    analystCount: 32,
    impliedStraddleMovePct: 4.2,
    keyFocusThemes: [
      'Apple Intelligence Generative Features Rollout',
      'Services Segment Cloud & App Store Margins',
      'Greater China & India Retail Channel Demand'
    ],
    historicalQuarters: [
      {
        quarter: 'Q3 FY26',
        date: '2026-08-01',
        estimatedEPS: 1.35,
        actualEPS: 1.40,
        surprisePct: 3.70,
        outcome: 'BEAT',
        revenueEstimated: '$84.5B',
        revenueActual: '$85.8B',
        postEarningsMovePct: 0.7
      },
      {
        quarter: 'Q2 FY26',
        date: '2026-05-02',
        estimatedEPS: 1.50,
        actualEPS: 1.53,
        surprisePct: 2.00,
        outcome: 'BEAT',
        revenueEstimated: '$90.0B',
        revenueActual: '$90.8B',
        postEarningsMovePct: 6.0
      },
      {
        quarter: 'Q1 FY26',
        date: '2026-02-01',
        estimatedEPS: 2.10,
        actualEPS: 2.18,
        surprisePct: 3.81,
        outcome: 'BEAT',
        revenueEstimated: '$118.0B',
        revenueActual: '$119.6B',
        postEarningsMovePct: -1.2
      },
      {
        quarter: 'Q4 FY25',
        date: '2025-11-02',
        estimatedEPS: 1.39,
        actualEPS: 1.46,
        surprisePct: 5.04,
        outcome: 'BEAT',
        revenueEstimated: '$89.3B',
        revenueActual: '$89.5B',
        postEarningsMovePct: 2.4
      }
    ]
  },
  'RELIANCE.NS': {
    ticker: 'RELIANCE.NS',
    reportDateStr: '2026-11-14',
    session: 'AMC',
    fiscalPeriod: 'Q2 FY27',
    isConfirmed: true,
    estimatedEPS: 32.40,
    estimatedEPSLow: 30.50,
    estimatedEPSHigh: 34.80,
    yoyEPSGrowthPct: 8.5,
    estimatedRevenue: '₹2,68,500 Cr',
    yoyRevenueGrowthPct: 10.4,
    analystCount: 28,
    impliedStraddleMovePct: 3.2,
    keyFocusThemes: [
      'Jio 5G Tariff Hikes & ARPU Expansion',
      'Reliance Retail Footprint & Quick-Commerce Integration',
      'New Energy Solar & Green Hydrogen Gigafactory Outlay'
    ],
    historicalQuarters: [
      {
        quarter: 'Q1 FY27',
        date: '2026-07-19',
        estimatedEPS: 31.00,
        actualEPS: 32.80,
        surprisePct: 5.81,
        outcome: 'BEAT',
        revenueEstimated: '₹2,55,000 Cr',
        revenueActual: '₹2,57,800 Cr',
        postEarningsMovePct: 1.8
      },
      {
        quarter: 'Q4 FY26',
        date: '2026-04-22',
        estimatedEPS: 29.50,
        actualEPS: 30.20,
        surprisePct: 2.37,
        outcome: 'BEAT',
        revenueEstimated: '₹2,42,000 Cr',
        revenueActual: '₹2,40,700 Cr',
        postEarningsMovePct: 0.6
      },
      {
        quarter: 'Q3 FY26',
        date: '2026-01-19',
        estimatedEPS: 28.20,
        actualEPS: 29.10,
        surprisePct: 3.19,
        outcome: 'BEAT',
        revenueEstimated: '₹2,30,000 Cr',
        revenueActual: '₹2,32,400 Cr',
        postEarningsMovePct: 1.2
      },
      {
        quarter: 'Q2 FY26',
        date: '2025-10-27',
        estimatedEPS: 27.40,
        actualEPS: 26.80,
        surprisePct: -2.19,
        outcome: 'MISS',
        revenueEstimated: '₹2,22,000 Cr',
        revenueActual: '₹2,20,500 Cr',
        postEarningsMovePct: -1.4
      }
    ]
  },
  'TMCV.NS': {
    ticker: 'TMCV.NS',
    reportDateStr: '2026-11-18',
    session: 'AMC',
    fiscalPeriod: 'Q2 FY27',
    isConfirmed: true,
    estimatedEPS: 12.60,
    estimatedEPSLow: 11.80,
    estimatedEPSHigh: 13.40,
    yoyEPSGrowthPct: 14.5,
    estimatedRevenue: '₹1,12,000 Cr',
    yoyRevenueGrowthPct: 8.8,
    analystCount: 24,
    impliedStraddleMovePct: 4.5,
    keyFocusThemes: [
      'Commercial Vehicle Replacement Cycle in Domestic Market',
      'Raw Material Steel & Commodity Deflation Margins',
      'Medium & Heavy Truck Tonnage Realizations'
    ],
    historicalQuarters: [
      {
        quarter: 'Q1 FY27',
        date: '2026-08-01',
        estimatedEPS: 11.20,
        actualEPS: 12.10,
        surprisePct: 8.04,
        outcome: 'BEAT',
        revenueEstimated: '₹1,04,000 Cr',
        revenueActual: '₹1,08,000 Cr',
        postEarningsMovePct: 3.6
      },
      {
        quarter: 'Q4 FY26',
        date: '2026-05-10',
        estimatedEPS: 10.50,
        actualEPS: 11.40,
        surprisePct: 8.57,
        outcome: 'BEAT',
        revenueEstimated: '₹98,000 Cr',
        revenueActual: '₹1,02,000 Cr',
        postEarningsMovePct: 4.2
      },
      {
        quarter: 'Q3 FY26',
        date: '2026-02-02',
        estimatedEPS: 9.80,
        actualEPS: 9.50,
        surprisePct: -3.06,
        outcome: 'MISS',
        revenueEstimated: '₹94,000 Cr',
        revenueActual: '₹92,500 Cr',
        postEarningsMovePct: -2.8
      },
      {
        quarter: 'Q2 FY26',
        date: '2025-11-02',
        estimatedEPS: 8.90,
        actualEPS: 9.40,
        surprisePct: 5.62,
        outcome: 'BEAT',
        revenueEstimated: '₹88,000 Cr',
        revenueActual: '₹90,200 Cr',
        postEarningsMovePct: 1.9
      }
    ]
  },
  NVDA: {
    ticker: 'NVDA',
    reportDateStr: '2026-11-20',
    session: 'AMC',
    fiscalPeriod: 'Q3 FY27',
    isConfirmed: true,
    estimatedEPS: 0.75,
    estimatedEPSLow: 0.71,
    estimatedEPSHigh: 0.82,
    yoyEPSGrowthPct: 87.5,
    estimatedRevenue: '$33.15B',
    yoyRevenueGrowthPct: 83.0,
    analystCount: 38,
    impliedStraddleMovePct: 7.8,
    keyFocusThemes: [
      'Blackwell Ultra GB200 Systems Production Ramp',
      'Sovereign AI & Hyperscale Cloud Infrastructure Capex',
      'Spectrum-X Ethernet Networking Attach Rates'
    ],
    historicalQuarters: [
      {
        quarter: 'Q2 FY27',
        date: '2026-08-28',
        estimatedEPS: 0.64,
        actualEPS: 0.68,
        surprisePct: 6.25,
        outcome: 'BEAT',
        revenueEstimated: '$28.7B',
        revenueActual: '$30.0B',
        postEarningsMovePct: 2.1
      },
      {
        quarter: 'Q1 FY27',
        date: '2026-05-22',
        estimatedEPS: 0.56,
        actualEPS: 0.61,
        surprisePct: 8.93,
        outcome: 'BEAT',
        revenueEstimated: '$24.6B',
        revenueActual: '$26.0B',
        postEarningsMovePct: 9.3
      },
      {
        quarter: 'Q4 FY26',
        date: '2026-02-21',
        estimatedEPS: 0.46,
        actualEPS: 0.51,
        surprisePct: 10.87,
        outcome: 'BEAT',
        revenueEstimated: '$20.6B',
        revenueActual: '$22.1B',
        postEarningsMovePct: 16.4
      },
      {
        quarter: 'Q3 FY26',
        date: '2025-11-21',
        estimatedEPS: 0.34,
        actualEPS: 0.40,
        surprisePct: 17.65,
        outcome: 'BEAT',
        revenueEstimated: '$16.1B',
        revenueActual: '$18.1B',
        postEarningsMovePct: 4.8
      }
    ]
  },
  MSFT: {
    ticker: 'MSFT',
    reportDateStr: '2026-11-25',
    session: 'AMC',
    fiscalPeriod: 'Q1 FY27',
    isConfirmed: true,
    estimatedEPS: 3.10,
    estimatedEPSLow: 3.02,
    estimatedEPSHigh: 3.18,
    yoyEPSGrowthPct: 11.1,
    estimatedRevenue: '$64.50B',
    yoyRevenueGrowthPct: 14.2,
    analystCount: 35,
    impliedStraddleMovePct: 4.8,
    keyFocusThemes: [
      'Azure Cloud AI Revenue Acceleration & Capacity Bottlenecks',
      'Copilot Enterprise Seat Expansion & Renewal ARPU',
      'Gaming Activision Blizzard Content Synergies'
    ],
    historicalQuarters: [
      {
        quarter: 'Q4 FY26',
        date: '2026-07-30',
        estimatedEPS: 2.93,
        actualEPS: 2.95,
        surprisePct: 0.68,
        outcome: 'BEAT',
        revenueEstimated: '$64.7B',
        revenueActual: '$64.7B',
        postEarningsMovePct: -2.8
      },
      {
        quarter: 'Q3 FY26',
        date: '2026-04-25',
        estimatedEPS: 2.82,
        actualEPS: 2.94,
        surprisePct: 4.26,
        outcome: 'BEAT',
        revenueEstimated: '$60.8B',
        revenueActual: '$61.9B',
        postEarningsMovePct: 1.8
      },
      {
        quarter: 'Q2 FY26',
        date: '2026-01-30',
        estimatedEPS: 2.77,
        actualEPS: 2.93,
        surprisePct: 5.78,
        outcome: 'BEAT',
        revenueEstimated: '$61.1B',
        revenueActual: '$62.0B',
        postEarningsMovePct: -1.5
      },
      {
        quarter: 'Q1 FY26',
        date: '2025-10-24',
        estimatedEPS: 2.65,
        actualEPS: 2.99,
        surprisePct: 12.83,
        outcome: 'BEAT',
        revenueEstimated: '$54.5B',
        revenueActual: '$56.5B',
        postEarningsMovePct: 3.1
      }
    ]
  },
  TSLA: {
    ticker: 'TSLA',
    reportDateStr: '2026-12-03',
    session: 'AMC',
    fiscalPeriod: 'Q4 FY26',
    isConfirmed: false,
    estimatedEPS: 0.68,
    estimatedEPSLow: 0.58,
    estimatedEPSHigh: 0.76,
    yoyEPSGrowthPct: 13.3,
    estimatedRevenue: '$26.80B',
    yoyRevenueGrowthPct: 12.0,
    analystCount: 29,
    impliedStraddleMovePct: 9.4,
    keyFocusThemes: [
      'Full Self-Driving (FSD) Unsupervised State Regulatory Milestones',
      'Megapack Stationary Energy Storage Factory Output',
      'Next-Gen Compact EV Platform Production Schedule'
    ],
    historicalQuarters: [
      {
        quarter: 'Q3 FY26',
        date: '2026-10-23',
        estimatedEPS: 0.60,
        actualEPS: 0.72,
        surprisePct: 20.0,
        outcome: 'BEAT',
        revenueEstimated: '$25.4B',
        revenueActual: '$25.2B',
        postEarningsMovePct: 21.9
      },
      {
        quarter: 'Q2 FY26',
        date: '2026-07-23',
        estimatedEPS: 0.62,
        actualEPS: 0.52,
        surprisePct: -16.13,
        outcome: 'MISS',
        revenueEstimated: '$24.7B',
        revenueActual: '$25.5B',
        postEarningsMovePct: -12.3
      },
      {
        quarter: 'Q1 FY26',
        date: '2026-04-23',
        estimatedEPS: 0.51,
        actualEPS: 0.45,
        surprisePct: -11.76,
        outcome: 'MISS',
        revenueEstimated: '$22.2B',
        revenueActual: '$21.3B',
        postEarningsMovePct: 12.1
      },
      {
        quarter: 'Q4 FY25',
        date: '2026-01-24',
        estimatedEPS: 0.74,
        actualEPS: 0.71,
        surprisePct: -4.05,
        outcome: 'MISS',
        revenueEstimated: '$25.6B',
        revenueActual: '$25.2B',
        postEarningsMovePct: -12.1
      }
    ]
  },
  'TCS.NS': {
    ticker: 'TCS.NS',
    reportDateStr: '2026-12-08',
    session: 'BMO',
    fiscalPeriod: 'Q3 FY27',
    isConfirmed: true,
    estimatedEPS: 36.80,
    estimatedEPSLow: 35.20,
    estimatedEPSHigh: 38.50,
    yoyEPSGrowthPct: 9.2,
    estimatedRevenue: '₹66,800 Cr',
    yoyRevenueGrowthPct: 7.4,
    analystCount: 34,
    impliedStraddleMovePct: 3.8,
    keyFocusThemes: [
      'North America BFSI IT Spend Discretionary Recovery',
      'Total Contract Value (TCV) Large Multi-Year Deals Pipeline',
      'AI Cloud Migration Workloads Billing Realizations'
    ],
    historicalQuarters: [
      {
        quarter: 'Q2 FY27',
        date: '2026-10-10',
        estimatedEPS: 35.00,
        actualEPS: 35.80,
        surprisePct: 2.29,
        outcome: 'BEAT',
        revenueEstimated: '₹64,200 Cr',
        revenueActual: '₹64,988 Cr',
        postEarningsMovePct: 2.3
      },
      {
        quarter: 'Q1 FY27',
        date: '2026-07-11',
        estimatedEPS: 33.50,
        actualEPS: 34.20,
        surprisePct: 2.09,
        outcome: 'BEAT',
        revenueEstimated: '₹62,000 Cr',
        revenueActual: '₹62,613 Cr',
        postEarningsMovePct: 3.1
      },
      {
        quarter: 'Q4 FY26',
        date: '2026-04-12',
        estimatedEPS: 32.80,
        actualEPS: 33.60,
        surprisePct: 2.44,
        outcome: 'BEAT',
        revenueEstimated: '₹60,500 Cr',
        revenueActual: '₹61,237 Cr',
        postEarningsMovePct: 0.9
      },
      {
        quarter: 'Q3 FY26',
        date: '2026-01-11',
        estimatedEPS: 31.50,
        actualEPS: 31.60,
        surprisePct: 0.32,
        outcome: 'INLINE',
        revenueEstimated: '₹59,200 Cr',
        revenueActual: '₹59,450 Cr',
        postEarningsMovePct: -0.4
      }
    ]
  },
  'INFY.NS': {
    ticker: 'INFY.NS',
    reportDateStr: '2026-12-15',
    session: 'BMO',
    fiscalPeriod: 'Q3 FY27',
    isConfirmed: false,
    estimatedEPS: 17.20,
    estimatedEPSLow: 16.50,
    estimatedEPSHigh: 17.80,
    yoyEPSGrowthPct: 8.2,
    estimatedRevenue: '₹41,200 Cr',
    yoyRevenueGrowthPct: 6.8,
    analystCount: 30,
    impliedStraddleMovePct: 4.0,
    keyFocusThemes: [
      'FY27 Constant Currency (CC) Revenue Guidance Adjustments',
      'Infosys Topaz GenAI Deal Signings Across Global 2000',
      'Operating Margin Defensibility & Subcontractor Reductions'
    ],
    historicalQuarters: [
      {
        quarter: 'Q2 FY27',
        date: '2026-10-17',
        estimatedEPS: 16.40,
        actualEPS: 16.80,
        surprisePct: 2.44,
        outcome: 'BEAT',
        revenueEstimated: '₹39,800 Cr',
        revenueActual: '₹40,100 Cr',
        postEarningsMovePct: 2.1
      },
      {
        quarter: 'Q1 FY27',
        date: '2026-07-18',
        estimatedEPS: 15.80,
        actualEPS: 16.10,
        surprisePct: 1.90,
        outcome: 'BEAT',
        revenueEstimated: '₹38,500 Cr',
        revenueActual: '₹38,900 Cr',
        postEarningsMovePct: 1.5
      },
      {
        quarter: 'Q4 FY26',
        date: '2026-04-18',
        estimatedEPS: 15.20,
        actualEPS: 15.10,
        surprisePct: -0.66,
        outcome: 'MISS',
        revenueEstimated: '₹37,500 Cr',
        revenueActual: '₹37,300 Cr',
        postEarningsMovePct: -1.8
      },
      {
        quarter: 'Q3 FY26',
        date: '2026-01-11',
        estimatedEPS: 14.80,
        actualEPS: 15.20,
        surprisePct: 2.70,
        outcome: 'BEAT',
        revenueEstimated: '₹36,800 Cr',
        revenueActual: '₹37,100 Cr',
        postEarningsMovePct: 3.4
      }
    ]
  },
  GOOGL: {
    ticker: 'GOOGL',
    reportDateStr: '2026-11-24',
    session: 'AMC',
    fiscalPeriod: 'Q3 FY26',
    isConfirmed: true,
    estimatedEPS: 1.95,
    estimatedEPSLow: 1.88,
    estimatedEPSHigh: 2.02,
    yoyEPSGrowthPct: 25.8,
    estimatedRevenue: '$86.30B',
    yoyRevenueGrowthPct: 12.5,
    analystCount: 36,
    impliedStraddleMovePct: 5.6,
    keyFocusThemes: [
      'Search AI Overviews Monetization & Query Volumes',
      'Google Cloud Vertex AI & TPU v5e/v6 Infra Bookings',
      'YouTube Shorts Ad Revenue & Subscription Run-Rates'
    ],
    historicalQuarters: [
      {
        quarter: 'Q2 FY26',
        date: '2026-07-23',
        estimatedEPS: 1.84,
        actualEPS: 1.89,
        surprisePct: 2.72,
        outcome: 'BEAT',
        revenueEstimated: '$84.2B',
        revenueActual: '$84.7B',
        postEarningsMovePct: -5.0
      },
      {
        quarter: 'Q1 FY26',
        date: '2026-04-25',
        estimatedEPS: 1.51,
        actualEPS: 1.89,
        surprisePct: 25.17,
        outcome: 'BEAT',
        revenueEstimated: '$78.6B',
        revenueActual: '$80.5B',
        postEarningsMovePct: 10.2
      },
      {
        quarter: 'Q4 FY25',
        date: '2026-01-30',
        estimatedEPS: 1.60,
        actualEPS: 1.64,
        surprisePct: 2.50,
        outcome: 'BEAT',
        revenueEstimated: '$85.3B',
        revenueActual: '$86.3B',
        postEarningsMovePct: -7.5
      },
      {
        quarter: 'Q3 FY25',
        date: '2025-10-24',
        estimatedEPS: 1.45,
        actualEPS: 1.55,
        surprisePct: 6.90,
        outcome: 'BEAT',
        revenueEstimated: '$75.5B',
        revenueActual: '$76.7B',
        postEarningsMovePct: -9.5
      }
    ]
  }
};

/**
 * Builds and returns rich earnings calendar items for requested tickers
 */
export async function getEarningsCalendarData(
  watchlistTickers: string[] = ['RELIANCE.NS', 'TCS.NS', 'NVDA', 'AAPL', 'INFY.NS', 'MSFT', 'TSLA', 'TMCV.NS', 'AMD', 'GOOGL'],
  watchlistOnly = false
): Promise<EarningsCalendarItem[]> {
  const normalizedWatchlist = new Set(
    watchlistTickers.map((t) => {
      const up = t.toUpperCase();
      if (up === 'TATAMOTORS' || up === 'TATAMOTORS.NS') return 'TMCV.NS';
      return up;
    })
  );

  const candidateKeys = Object.keys(EARNINGS_PROFILES);
  const targetKeys = watchlistOnly
    ? candidateKeys.filter((k) => normalizedWatchlist.has(k))
    : candidateKeys;

  const nowMs = new Date('2026-11-03T05:00:00Z').getTime(); // Synchronized simulation date

  const items = await Promise.all(
    targetKeys.map(async (ticker) => {
      const profile = EARNINGS_PROFILES[ticker];
      let currentPrice = 100;
      let currency: 'INR' | 'USD' = ticker.endsWith('.NS') ? 'INR' : 'USD';
      let companyName = ticker;
      let sector = 'Equities';

      try {
        const q = await getStockQuote(ticker);
        currentPrice = q.price;
        currency = q.currency === 'USD' ? 'USD' : 'INR';
        companyName = q.name;
      } catch {
        const cat = TICKER_CATALOG.find((c) => c.ticker === ticker);
        if (cat) {
          currentPrice = cat.basePrice;
          currency = cat.currency === 'USD' ? 'USD' : 'INR';
          companyName = cat.name;
          sector = cat.sector;
        }
      }

      const catMeta = TICKER_CATALOG.find((c) => c.ticker === ticker);
      if (catMeta) {
        sector = catMeta.sector;
      }

      const reportDateObj = new Date(`${profile.reportDateStr}T16:00:00Z`);
      const diffMs = reportDateObj.getTime() - nowMs;
      const daysUntilReport = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const reportDateFormatted = `${months[reportDateObj.getUTCMonth()]} ${reportDateObj.getUTCDate()}, ${reportDateObj.getUTCFullYear()}`;

      // Calculate surprise metrics across 4 historical quarters
      const beatsCount = profile.historicalQuarters.filter((q) => q.outcome === 'BEAT').length;
      const totalQuarters = profile.historicalQuarters.length || 1;
      const beatRatePct = Number(((beatsCount / totalQuarters) * 100).toFixed(0));

      const avgSurprise = profile.historicalQuarters.reduce((acc, q) => acc + q.surprisePct, 0) / totalQuarters;
      const averageSurprisePct = Number(avgSurprise.toFixed(1));

      // Consecutive beats from the latest quarter backward
      let consecutiveBeats = 0;
      for (const q of profile.historicalQuarters) {
        if (q.outcome === 'BEAT') {
          consecutiveBeats++;
        } else {
          break;
        }
      }

      return {
        ticker,
        companyName,
        sector,
        currency,
        currSym: currency === 'INR' ? '₹' : '$',
        currentPrice,
        reportDate: profile.reportDateStr,
        reportDateFormatted,
        daysUntilReport,
        session: profile.session,
        fiscalPeriod: profile.fiscalPeriod,
        isConfirmed: profile.isConfirmed,
        estimatedEPS: profile.estimatedEPS,
        estimatedEPSLow: profile.estimatedEPSLow,
        estimatedEPSHigh: profile.estimatedEPSHigh,
        yoyEPSGrowthPct: profile.yoyEPSGrowthPct,
        estimatedRevenue: profile.estimatedRevenue,
        yoyRevenueGrowthPct: profile.yoyRevenueGrowthPct,
        analystCount: profile.analystCount,
        impliedStraddleMovePct: profile.impliedStraddleMovePct,
        historicalQuarters: profile.historicalQuarters,
        beatRatePct,
        averageSurprisePct,
        consecutiveBeats,
        keyFocusThemes: profile.keyFocusThemes,
        inWatchlist: normalizedWatchlist.has(ticker)
      };
    })
  );

  // Sort upcoming earnings chronologically (closest report date first)
  return items.sort((a, b) => a.daysUntilReport - b.daysUntilReport);
}
