/**
 * Alpaca Paper Trading Gateway & Broker Router Service
 * Simulates institutional paper trading execution, risk management limits,
 * stop-loss protection, profit-target ceilings, and comprehensive trade blotter
 * with calculated Realized and Unrealized PnL.
 */

import { getStockQuote } from './stockService';

export interface BrokerOrder {
  id: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  qty: number;
  type: 'MARKET' | 'LIMIT';
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timeInForce: 'DAY' | 'GTC';
  status: 'FILLED' | 'NEW' | 'CANCELED' | 'REJECTED';
  filledPrice: number;
  filledAt: string;
  createdAt: string;
  routingVenue: string;
  commission: number;
}

export interface TradePnLPoint {
  timestamp: string;
  pnl: number;
  pnlPct: number;
  price: number;
}

export interface BrokerTrade {
  id: string;
  orderId: string;
  ticker: string;
  companyName: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entryPrice: number;
  exitPrice: number; // For closed trades: realized exit price; for open trades: live mark-to-market price
  entryDate: string;
  exitDate?: string;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  realizedPnL?: number;
  realizedPnLPercent?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  currentPrice?: number;
  orderType: 'MARKET' | 'LIMIT';
  routingVenue: string;
  commission: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  notes?: string;
  pnlTrajectory?: TradePnLPoint[];
  sector?: string;
  assetClass?: string;
  currency?: string;
}

export interface BrokerAccount {
  accountId: string;
  accountNumber: string;
  status: 'ACTIVE' | 'ONBOARDING';
  currency: 'USD' | 'INR';
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  dayTradeCount: number;
  multiplier: number;
  gateway: string;
  lastSyncAt: string;
}

const companyNameMap: Record<string, string> = {
  NVDA: 'NVIDIA Corporation',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  TSLA: 'Tesla, Inc.',
  GOOGL: 'Alphabet Inc.',
  AMD: 'Advanced Micro Devices',
  'RELIANCE.NS': 'Reliance Industries Ltd.',
  'TCS.NS': 'Tata Consultancy Services',
  'TMCV.NS': 'Tata Motors Ltd.',
  TATAMOTORS: 'Tata Motors Ltd.',
  INFY: 'Infosys Ltd.'
};

class BrokerService {
  private account: BrokerAccount = {
    accountId: 'alpaca-paper-alphaquant-01',
    accountNumber: 'PA37K98201',
    status: 'ACTIVE',
    currency: 'USD',
    buyingPower: 248500.0,
    cash: 124250.0,
    portfolioValue: 185420.0,
    dayTradeCount: 2,
    multiplier: 2,
    gateway: 'Alpaca Paper API v2 (Direct High-Speed Router)',
    lastSyncAt: new Date().toISOString()
  };

  private orders: BrokerOrder[] = [
    {
      id: 'ord-alpaca-001',
      ticker: 'NVDA',
      side: 'BUY',
      qty: 50,
      type: 'MARKET',
      stopLossPrice: 118.0,
      takeProfitPrice: 220.0,
      timeInForce: 'GTC',
      status: 'FILLED',
      filledPrice: 126.8,
      filledAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      routingVenue: 'IEX / Alpaca Dark Pool',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-002',
      ticker: 'MSFT',
      side: 'BUY',
      qty: 20,
      type: 'LIMIT',
      limitPrice: 418.2,
      stopLossPrice: 400.0,
      takeProfitPrice: 450.0,
      timeInForce: 'DAY',
      status: 'FILLED',
      filledPrice: 418.2,
      filledAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      routingVenue: 'NASDAQ Direct / Alpaca',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-003',
      ticker: 'TMCV.NS',
      side: 'SELL',
      qty: 150,
      type: 'MARKET',
      timeInForce: 'GTC',
      status: 'FILLED',
      filledPrice: 396.35,
      filledAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      routingVenue: 'NSE Direct / High-Speed Gateway',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-004',
      ticker: 'TSLA',
      side: 'SELL',
      qty: 25,
      type: 'MARKET',
      timeInForce: 'GTC',
      status: 'FILLED',
      filledPrice: 259.2,
      filledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      routingVenue: 'IEX / Alpaca Dark Pool',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-005',
      ticker: 'AAPL',
      side: 'SELL',
      qty: 35,
      type: 'LIMIT',
      limitPrice: 228.45,
      timeInForce: 'DAY',
      status: 'FILLED',
      filledPrice: 228.45,
      filledAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      routingVenue: 'NASDAQ Direct / Alpaca SOR',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-006',
      ticker: 'AMD',
      side: 'SELL',
      qty: 30,
      type: 'LIMIT',
      limitPrice: 148.8,
      stopLossPrice: 149.0,
      timeInForce: 'GTC',
      status: 'FILLED',
      filledPrice: 148.8,
      filledAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      routingVenue: 'NYSE Arca / Alpaca SOR',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-007',
      ticker: 'GOOGL',
      side: 'BUY',
      qty: 40,
      type: 'LIMIT',
      limitPrice: 168.5,
      stopLossPrice: 162.0,
      takeProfitPrice: 188.0,
      timeInForce: 'GTC',
      status: 'NEW',
      filledPrice: 168.5,
      filledAt: '',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      routingVenue: 'NASDAQ Direct / Working Limit',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-008',
      ticker: 'RELIANCE.NS',
      side: 'SELL',
      qty: 50,
      type: 'LIMIT',
      limitPrice: 3020.0,
      stopLossPrice: 2940.0,
      takeProfitPrice: 3120.0,
      timeInForce: 'GTC',
      status: 'NEW',
      filledPrice: 3020.0,
      filledAt: '',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      routingVenue: 'NSE Direct / Working Limit',
      commission: 0.0
    }
  ];

  // Seeded Trade Blotter: Complete history of closed and open paper trades with entry/exit and PnL
  private trades: BrokerTrade[] = [
    {
      id: 'trade-alpaca-001',
      orderId: 'ord-alpaca-001',
      ticker: 'NVDA',
      companyName: 'NVIDIA Corporation',
      side: 'BUY',
      qty: 50,
      entryPrice: 126.8,
      exitPrice: 206.62,
      entryDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: 'OPEN',
      unrealizedPnL: 3991.0,
      unrealizedPnLPercent: 62.95,
      currentPrice: 206.62,
      orderType: 'MARKET',
      stopLossPrice: 118.0,
      takeProfitPrice: 220.0,
      routingVenue: 'IEX / Alpaca Dark Pool',
      commission: 0.0,
      notes: 'Active Momentum Long Breakout',
      sector: 'Semiconductors & AI Hardware',
      assetClass: 'US Semiconductor Equities',
      currency: 'USD'
    },
    {
      id: 'trade-alpaca-002',
      orderId: 'ord-alpaca-002',
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      side: 'BUY',
      qty: 20,
      entryPrice: 418.2,
      exitPrice: 432.8,
      entryDate: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'OPEN',
      unrealizedPnL: 292.0,
      unrealizedPnLPercent: 3.49,
      currentPrice: 432.8,
      orderType: 'LIMIT',
      stopLossPrice: 400.0,
      takeProfitPrice: 450.0,
      routingVenue: 'NASDAQ Direct / Alpaca',
      commission: 0.0,
      notes: 'Dip Buy on 20-Day EMA Support',
      sector: 'Enterprise Software & Cloud',
      assetClass: 'US Mega-Cap Tech',
      currency: 'USD'
    },
    {
      id: 'trade-alpaca-003',
      orderId: 'ord-alpaca-003',
      ticker: 'TMCV.NS',
      companyName: 'Tata Motors Ltd.',
      side: 'BUY',
      qty: 150,
      entryPrice: 382.5,
      exitPrice: 396.35,
      entryDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      exitDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      status: 'CLOSED',
      realizedPnL: 2077.5,
      realizedPnLPercent: 3.62,
      currentPrice: 396.35,
      orderType: 'MARKET',
      routingVenue: 'NSE Direct / High-Speed Gateway',
      commission: 0.0,
      notes: 'Earnings Runup Swing Target Hit',
      sector: 'Automobile & Transport',
      assetClass: 'Emerging Market Equities (NSE)',
      currency: 'INR'
    },
    {
      id: 'trade-alpaca-004',
      orderId: 'ord-alpaca-004',
      ticker: 'TSLA',
      companyName: 'Tesla, Inc.',
      side: 'BUY',
      qty: 25,
      entryPrice: 242.0,
      exitPrice: 259.2,
      entryDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      exitDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'CLOSED',
      realizedPnL: 430.0,
      realizedPnLPercent: 7.11,
      currentPrice: 259.2,
      orderType: 'MARKET',
      routingVenue: 'IEX / Alpaca Dark Pool',
      commission: 0.0,
      notes: 'Weekly Bull Flag Breakout Take-Profit',
      sector: 'Automotive & Clean Energy',
      assetClass: 'US Large-Cap Growth',
      currency: 'USD'
    },
    {
      id: 'trade-alpaca-005',
      orderId: 'ord-alpaca-005',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      side: 'BUY',
      qty: 35,
      entryPrice: 221.3,
      exitPrice: 228.45,
      entryDate: new Date(Date.now() - 86400000 * 7).toISOString(),
      exitDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'CLOSED',
      realizedPnL: 250.25,
      realizedPnLPercent: 3.23,
      currentPrice: 228.45,
      orderType: 'LIMIT',
      routingVenue: 'NASDAQ Direct / Alpaca SOR',
      commission: 0.0,
      notes: 'Markowitz Alpha Rebalance Realized',
      sector: 'Consumer Electronics & Tech',
      assetClass: 'US Mega-Cap Tech',
      currency: 'USD'
    },
    {
      id: 'trade-alpaca-006',
      orderId: 'ord-alpaca-006',
      ticker: 'AMD',
      companyName: 'Advanced Micro Devices',
      side: 'BUY',
      qty: 30,
      entryPrice: 156.4,
      exitPrice: 148.8,
      entryDate: new Date(Date.now() - 86400000 * 6).toISOString(),
      exitDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      status: 'CLOSED',
      realizedPnL: -228.0,
      realizedPnLPercent: -4.86,
      currentPrice: 148.8,
      orderType: 'LIMIT',
      stopLossPrice: 149.0,
      routingVenue: 'NYSE Arca / Alpaca SOR',
      commission: 0.0,
      notes: 'Stop-Loss Risk Trigger Executed',
      sector: 'Semiconductors & AI Hardware',
      assetClass: 'US Semiconductor Equities',
      currency: 'USD'
    },
    {
      id: 'trade-alpaca-007',
      orderId: 'ord-alpaca-007',
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      side: 'BUY',
      qty: 40,
      entryPrice: 168.5,
      exitPrice: 168.5,
      entryDate: new Date(Date.now() - 3600000 * 1).toISOString(),
      status: 'PENDING',
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentPrice: 173.2,
      orderType: 'LIMIT',
      stopLossPrice: 162.0,
      takeProfitPrice: 188.0,
      routingVenue: 'NASDAQ Direct / Working Limit',
      commission: 0.0,
      notes: 'GTC Working Limit Buy Order awaiting pullback to $168.50 support'
    },
    {
      id: 'trade-alpaca-008',
      orderId: 'ord-alpaca-008',
      ticker: 'RELIANCE.NS',
      companyName: 'Reliance Industries Ltd.',
      side: 'SELL',
      qty: 50,
      entryPrice: 3020.0,
      exitPrice: 3020.0,
      entryDate: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'PENDING',
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentPrice: 2985.0,
      orderType: 'LIMIT',
      stopLossPrice: 2940.0,
      takeProfitPrice: 3120.0,
      routingVenue: 'NSE Direct / Working Limit',
      commission: 0.0,
      notes: 'Working Take-Profit Limit Sell Order targeting ₹3,020 resistance'
    }
  ];

  public getAccount(): BrokerAccount {
    this.account.lastSyncAt = new Date().toISOString();
    return { ...this.account };
  }

  public getOrders(): BrokerOrder[] {
    return [...this.orders];
  }

  public getTrades(): BrokerTrade[] {
    return [...this.trades];
  }

  /**
   * Fetches live market prices for all open trades to ensure accurate mark-to-market exit prices and unrealized PnL.
   */
  public async getTradesWithLiveQuotes(): Promise<BrokerTrade[]> {
    const updated = await Promise.all(
      this.trades.map(async (trade) => {
        if (trade.status === 'OPEN') {
          try {
            const quote = await getStockQuote(trade.ticker);
            if (quote && quote.price) {
              const curPrice = Number(quote.price.toFixed(2));
              const delta = curPrice - trade.entryPrice;
              return {
                ...trade,
                currentPrice: curPrice,
                exitPrice: curPrice,
                unrealizedPnL: Number((delta * trade.qty).toFixed(2)),
                unrealizedPnLPercent: Number(((delta / trade.entryPrice) * 100).toFixed(2))
              };
            }
          } catch (e) {
            // retain existing estimate if quote fails
          }
        } else if (trade.status === 'PENDING') {
          try {
            const quote = await getStockQuote(trade.ticker);
            if (quote && quote.price) {
              return {
                ...trade,
                currentPrice: Number(quote.price.toFixed(2))
              };
            }
          } catch (e) {
            // retain existing estimate
          }
        }
        return trade;
      })
    );

    // Return sorted chronologically (newest first)
    return updated.sort((a, b) => {
      const dateA = new Date(a.exitDate || a.entryDate).getTime();
      const dateB = new Date(b.exitDate || b.entryDate).getTime();
      return dateB - dateA;
    });
  }

  public placeOrder(params: {
    ticker: string;
    side: 'BUY' | 'SELL';
    qty: number;
    type: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    timeInForce?: 'DAY' | 'GTC';
    currentMarketPrice: number;
  }): BrokerOrder {
    const qty = Math.max(1, Math.floor(params.qty));
    const executionPrice =
      params.type === 'LIMIT' && params.limitPrice
        ? params.limitPrice
        : params.currentMarketPrice;

    const notional = executionPrice * qty;

    if (params.side === 'BUY' && notional > this.account.buyingPower) {
      throw new Error(
        `Insufficient buying power ($${this.account.buyingPower.toLocaleString()}) for notional order size $${notional.toLocaleString()}`
      );
    }

    const orderId = `ord-alpaca-${Date.now()}`;
    const cleanTicker = params.ticker.toUpperCase();
    const compName = companyNameMap[cleanTicker] || `${cleanTicker} Asset`;
    const venue = 'Alpaca Smart Order Router (SOR)';
    const nowIso = new Date().toISOString();

    const order: BrokerOrder = {
      id: orderId,
      ticker: cleanTicker,
      side: params.side,
      qty,
      type: params.type,
      limitPrice: params.limitPrice,
      stopLossPrice: params.stopLossPrice,
      takeProfitPrice: params.takeProfitPrice,
      timeInForce: params.timeInForce || 'GTC',
      status: 'FILLED',
      filledPrice: Number(executionPrice.toFixed(2)),
      filledAt: nowIso,
      createdAt: nowIso,
      routingVenue: venue,
      commission: 0.0
    };

    if (params.side === 'BUY') {
      this.account.cash -= notional;
      this.account.buyingPower -= notional;

      // Record a new OPEN paper trade in ledger
      const newTrade: BrokerTrade = {
        id: `trade-alpaca-${Date.now()}`,
        orderId,
        ticker: cleanTicker,
        companyName: compName,
        side: 'BUY',
        qty,
        entryPrice: Number(executionPrice.toFixed(2)),
        exitPrice: Number(executionPrice.toFixed(2)),
        entryDate: nowIso,
        status: 'OPEN',
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        currentPrice: Number(executionPrice.toFixed(2)),
        orderType: params.type,
        stopLossPrice: params.stopLossPrice,
        takeProfitPrice: params.takeProfitPrice,
        routingVenue: venue,
        commission: 0.0,
        notes: `Paper Buy Executed via BrokerRouter`
      };
      this.trades.unshift(newTrade);
    } else {
      // SELL order: close or reduce open position
      this.account.cash += notional;
      this.account.buyingPower += notional;

      const openIndex = this.trades.findIndex(
        (t) => t.ticker === cleanTicker && t.status === 'OPEN'
      );

      if (openIndex >= 0) {
        const openTrade = this.trades[openIndex];
        const exitPr = Number(executionPrice.toFixed(2));
        const matchedQty = Math.min(qty, openTrade.qty);
        const pnl = Number(((exitPr - openTrade.entryPrice) * matchedQty).toFixed(2));
        const pnlPct = Number((((exitPr - openTrade.entryPrice) / openTrade.entryPrice) * 100).toFixed(2));

        if (qty >= openTrade.qty) {
          // Fully close open trade
          openTrade.status = 'CLOSED';
          openTrade.exitPrice = exitPr;
          openTrade.exitDate = nowIso;
          openTrade.realizedPnL = pnl;
          openTrade.realizedPnLPercent = pnlPct;
          openTrade.unrealizedPnL = undefined;
          openTrade.unrealizedPnLPercent = undefined;
          openTrade.notes = `Position Closed via BrokerRouter Sell`;
        } else {
          // Partially close open trade
          openTrade.qty -= qty;
          const closedSubTrade: BrokerTrade = {
            id: `trade-alpaca-${Date.now()}`,
            orderId,
            ticker: cleanTicker,
            companyName: compName,
            side: 'BUY',
            qty,
            entryPrice: openTrade.entryPrice,
            exitPrice: exitPr,
            entryDate: openTrade.entryDate,
            exitDate: nowIso,
            status: 'CLOSED',
            realizedPnL: pnl,
            realizedPnLPercent: pnlPct,
            currentPrice: exitPr,
            orderType: params.type,
            routingVenue: venue,
            commission: 0.0,
            notes: `Partial Position Closed via BrokerRouter Sell`
          };
          this.trades.unshift(closedSubTrade);
        }
      } else {
        // Flat or short sale
        const closedTrade: BrokerTrade = {
          id: `trade-alpaca-${Date.now()}`,
          orderId,
          ticker: cleanTicker,
          companyName: compName,
          side: 'SELL',
          qty,
          entryPrice: Number(executionPrice.toFixed(2)),
          exitPrice: Number(executionPrice.toFixed(2)),
          entryDate: nowIso,
          exitDate: nowIso,
          status: 'CLOSED',
          realizedPnL: 0,
          realizedPnLPercent: 0,
          currentPrice: Number(executionPrice.toFixed(2)),
          orderType: params.type,
          routingVenue: venue,
          commission: 0.0,
          notes: `Direct Sell Order Executed via BrokerRouter`
        };
        this.trades.unshift(closedTrade);
      }
    }

    this.orders.unshift(order);
    return order;
  }

  public cancelOrder(orderId: string): boolean {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return false;
    order.status = 'CANCELED';
    this.trades = this.trades.filter((t) => !(t.orderId === orderId && t.status === 'PENDING'));
    return true;
  }
}

export const brokerService = new BrokerService();
