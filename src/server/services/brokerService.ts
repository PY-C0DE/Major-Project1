/**
 * Alpaca Paper Trading Gateway & Broker Router Service
 * Simulates institutional paper trading execution, risk management limits,
 * stop-loss protection, and profit-target ceilings.
 */

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

class BrokerService {
  private account: BrokerAccount = {
    accountId: 'alpaca-paper-alphaquant-01',
    accountNumber: 'PA37K98201',
    status: 'ACTIVE',
    currency: 'USD',
    buyingPower: 248500.0,
    cash: 124250.0,
    portfolioValue: 185420.0,
    dayTradeCount: 1,
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
      takeProfitPrice: 145.0,
      timeInForce: 'GTC',
      status: 'FILLED',
      filledPrice: 126.8,
      filledAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      routingVenue: 'IEX / Alpaca Dark Pool',
      commission: 0.0
    },
    {
      id: 'ord-alpaca-002',
      ticker: 'AAPL',
      side: 'BUY',
      qty: 40,
      type: 'LIMIT',
      limitPrice: 226.5,
      stopLossPrice: 215.0,
      takeProfitPrice: 242.0,
      timeInForce: 'DAY',
      status: 'FILLED',
      filledPrice: 226.4,
      filledAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      routingVenue: 'NASDAQ Direct / Alpaca',
      commission: 0.0
    }
  ];

  public getAccount(): BrokerAccount {
    this.account.lastSyncAt = new Date().toISOString();
    return { ...this.account };
  }

  public getOrders(): BrokerOrder[] {
    return [...this.orders];
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
      throw new Error(`Insufficient buying power ($${this.account.buyingPower.toLocaleString()}) for notional order size $${notional.toLocaleString()}`);
    }

    const order: BrokerOrder = {
      id: `ord-alpaca-${Date.now()}`,
      ticker: params.ticker.toUpperCase(),
      side: params.side,
      qty,
      type: params.type,
      limitPrice: params.limitPrice,
      stopLossPrice: params.stopLossPrice,
      takeProfitPrice: params.takeProfitPrice,
      timeInForce: params.timeInForce || 'GTC',
      status: 'FILLED',
      filledPrice: Number(executionPrice.toFixed(2)),
      filledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      routingVenue: 'Alpaca Smart Order Router (SOR)',
      commission: 0.0
    };

    if (params.side === 'BUY') {
      this.account.cash -= notional;
      this.account.buyingPower -= notional;
    } else {
      this.account.cash += notional;
      this.account.buyingPower += notional;
    }

    this.orders.unshift(order);
    return order;
  }

  public cancelOrder(orderId: string): boolean {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return false;
    order.status = 'CANCELED';
    return true;
  }
}

export const brokerService = new BrokerService();
