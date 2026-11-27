import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  serial,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  tokenVersion: integer('token_version').default(1).notNull(),
  createdAt: text('created_at').notNull(),
  isDemoUser: boolean('is_demo_user').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  title: text('title'),
  organization: text('organization'),
  phone: text('phone'),
  bio: text('bio'),
  timezone: text('timezone'),
  currencyPreference: text('currency_preference').default('INR'),
  defaultExchange: text('default_exchange').default('NSE'),
  confidenceLevel: integer('confidence_level').default(90),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  notifications: jsonb('notifications').$type<{
    emailAlerts: boolean;
    regimeShifts: boolean;
    driftWarnings: boolean;
    marketOpenSummary: boolean;
  }>()
});

export const portfolios = pgTable(
  'portfolios',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    companyName: text('company_name').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    avgBuyPrice: doublePrecision('avg_buy_price').notNull(),
    currentPrice: doublePrecision('current_price').notNull(),
    totalInvested: doublePrecision('total_invested').notNull(),
    currentValue: doublePrecision('current_value').notNull(),
    pnl: doublePrecision('pnl').notNull(),
    pnlPercent: doublePrecision('pnl_percent').notNull(),
    purchaseDate: text('purchase_date').notNull(),
    sector: text('sector'),
    currency: text('currency'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index('portfolios_user_id_idx').on(table.userId)]
);

export const watchlists = pgTable(
  'watchlists',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('watchlists_user_ticker_uq').on(table.userId, table.ticker),
    index('watchlists_user_id_idx').on(table.userId)
  ]
);

export const alerts = pgTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    type: text('type').notNull(),
    threshold: doublePrecision('threshold'),
    label: text('label').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: text('created_at').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>()
  },
  (table) => [index('alerts_user_id_idx').on(table.userId)]
);

export const predictionHistory = pgTable(
  'prediction_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ticker: text('ticker').notNull(),
    currency: text('currency').default('USD').notNull(),
    predictedPrice: doublePrecision('predicted_price').notNull(),
    currentPrice: doublePrecision('current_price').notNull(),
    lowerBound: doublePrecision('lower_bound').notNull(),
    upperBound: doublePrecision('upper_bound').notNull(),
    confidenceLevel: doublePrecision('confidence_level').notNull(),
    marketRegime: text('market_regime').notNull(),
    sentimentScore: doublePrecision('sentiment_score').notNull(),
    timestamp: text('timestamp').notNull()
  },
  (table) => [
    index('prediction_history_user_id_idx').on(table.userId),
    index('prediction_history_ticker_idx').on(table.ticker)
  ]
);

export const dailySentiment = pgTable(
  'daily_sentiment',
  {
    id: serial('id').primaryKey(),
    ticker: text('ticker').notNull(),
    date: text('date').notNull(),
    credibilityWeightedNetScore: doublePrecision('credibility_weighted_net_score').notNull(),
    articleCount: integer('article_count').notNull(),
    sentimentSource: text('sentiment_source').notNull(),
    language: text('language').default('en').notNull(),
    modelId: text('model_id').default('keyword-lexicon-fallback').notNull(),
    modelVersion: text('model_version').default('1.0.0').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('daily_sentiment_ticker_date_uq').on(table.ticker, table.date),
    index('daily_sentiment_date_idx').on(table.date)
  ]
);

export const tickerMaster = pgTable(
  'ticker_master',
  {
    symbol: text('symbol').primaryKey(),
    name: text('name').notNull(),
    exchange: text('exchange').notNull(),
    exchangeCode: text('exchange_code').notNull(),
    country: text('country').notNull(),
    currency: text('currency').notNull(),
    timezone: text('timezone').notNull(),
    assetType: text('asset_type').default('EQUITY').notNull(),
    sector: text('sector').default('Equities').notNull(),
    pe: doublePrecision('pe'),
    marketCap: doublePrecision('market_cap'),
    basePrice: doublePrecision('base_price'),
    aliases: jsonb('aliases').$type<string[]>().default([]).notNull(),
    active: boolean('active').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('ticker_master_country_idx').on(table.country),
    index('ticker_master_exchange_idx').on(table.exchange),
    index('ticker_master_exchange_code_idx').on(table.exchangeCode),
    index('ticker_master_name_idx').on(table.name),
    index('ticker_master_active_idx').on(table.active),
    index('ticker_master_active_country_exchange_idx').on(table.active, table.country, table.exchange)
  ]
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // 'email_verification' | 'password_reset'
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('auth_tokens_hash_uq').on(table.tokenHash),
    index('auth_tokens_user_id_idx').on(table.userId),
    index('auth_tokens_purpose_idx').on(table.purpose)
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(portfolios),
  watchlists: many(watchlists),
  alerts: many(alerts),
  predictionHistory: many(predictionHistory),
  authTokens: many(authTokens)
}));

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id]
  })
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id]
  })
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id]
  })
}));

export const predictionHistoryRelations = relations(predictionHistory, ({ one }) => ({
  user: one(users, {
    fields: [predictionHistory.userId],
    references: [users.id]
  })
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id]
  })
}));
