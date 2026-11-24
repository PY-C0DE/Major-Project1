/**
 * Pluggable Storage Facade
 * Selects PostgreSQL (via Drizzle ORM / Cloud SQL) in production and PG-configured runtimes,
 * failing closed in NODE_ENV=production if database credentials are missing,
 * while providing an InMemoryRepository (with optional ALPHAQUANT_STORE_PATH disk persistence) for tests.
 */

import { hasPostgresConfig } from '../../db/index.ts';
import {
  DatabaseRepository,
  InMemoryRepository,
  PostgresRepository,
  StoredPrediction,
  UserAccount
} from './repository';

export type { StoredPrediction, UserAccount, DatabaseRepository };
export { InMemoryRepository, PostgresRepository };

function createDefaultRepository(): DatabaseRepository {
  const storePathOverride = process.env.ALPHAQUANT_STORE_PATH?.trim();
  const forceMemory = process.env.ALPHAQUANT_STORE_MODE?.trim().toLowerCase() === 'memory';
  const isTestEnv = process.env.NODE_ENV === 'test' && process.env.ALPHAQUANT_USE_PG_IN_TESTS !== 'true';

  if (storePathOverride) {
    return new InMemoryRepository({ filePath: storePathOverride });
  }

  if (forceMemory || isTestEnv) {
    return new InMemoryRepository();
  }

  if (process.env.NODE_ENV === 'production' && !hasPostgresConfig()) {
    throw new Error(
      'Database configuration missing in production: SQL_HOST, SQL_USER, SQL_PASSWORD, and SQL_DB_NAME are required.'
    );
  }

  if (hasPostgresConfig()) {
    return new PostgresRepository();
  }

  // Non-production fallback when no PostgreSQL environment is configured
  return new InMemoryRepository();
}

let activeRepo: DatabaseRepository = createDefaultRepository();

export function getRepository(): DatabaseRepository {
  return activeRepo;
}

export function setRepository(repo: DatabaseRepository): void {
  activeRepo = repo;
}

export function resetRepository(): void {
  activeRepo = createDefaultRepository();
}

export function createInMemoryRepository(options?: { filePath?: string | null }): InMemoryRepository {
  return new InMemoryRepository(options);
}

export const db = {
  getUserByEmail: (email: string) => activeRepo.getUserByEmail(email),
  getUserById: (id: string) => activeRepo.getUserById(id),
  getUserByFirebaseUid: (uid: string) => activeRepo.getUserByFirebaseUid(uid),
  getOrCreateFirebaseUser: (profile: {
    uid: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  }) => activeRepo.getOrCreateFirebaseUser(profile),
  createUser: (user: UserAccount) => activeRepo.createUser(user),
  updateUser: (userId: string, updates: Partial<UserAccount>) => activeRepo.updateUser(userId, updates),

  getPortfolio: (userId: string) => activeRepo.getPortfolio(userId),
  savePortfolio: (userId: string, holdings: Parameters<DatabaseRepository['savePortfolio']>[1]) =>
    activeRepo.savePortfolio(userId, holdings),
  addHolding: (userId: string, holding: Parameters<DatabaseRepository['addHolding']>[1]) =>
    activeRepo.addHolding(userId, holding),
  updateHolding: (userId: string, id: string, updates: Parameters<DatabaseRepository['updateHolding']>[2]) =>
    activeRepo.updateHolding(userId, id, updates),
  deleteHolding: (userId: string, id: string) => activeRepo.deleteHolding(userId, id),

  getWatchlist: (userId: string) => activeRepo.getWatchlist(userId),
  addToWatchlist: (userId: string, ticker: string) => activeRepo.addToWatchlist(userId, ticker),
  removeFromWatchlist: (userId: string, ticker: string) => activeRepo.removeFromWatchlist(userId, ticker),

  getAlerts: (userId: string) => activeRepo.getAlerts(userId),
  createAlert: (userId: string, alert: Parameters<DatabaseRepository['createAlert']>[1]) =>
    activeRepo.createAlert(userId, alert),
  toggleAlert: (userId: string, alertId: string, enabled: boolean) =>
    activeRepo.toggleAlert(userId, alertId, enabled),
  deleteAlert: (userId: string, alertId: string) => activeRepo.deleteAlert(userId, alertId),

  addPrediction: (pred: StoredPrediction) => activeRepo.addPrediction(pred),
  getPredictionHistory: (userId?: string, ticker?: string) => activeRepo.getPredictionHistory(userId, ticker),

  upsertDailySentiment: (
    records: Parameters<DatabaseRepository['upsertDailySentiment']>[0],
    options?: Parameters<DatabaseRepository['upsertDailySentiment']>[1]
  ) => activeRepo.upsertDailySentiment(records, options),
  getDailySentimentForTicker: (ticker: string) => activeRepo.getDailySentimentForTicker(ticker),
  getAllDailySentiment: () => activeRepo.getAllDailySentiment(),
  getDailySentimentCountsByTicker: () => activeRepo.getDailySentimentCountsByTicker(),

  searchTickers: (params: Parameters<DatabaseRepository['searchTickers']>[0]) => activeRepo.searchTickers(params),
  getTickerBySymbol: (symbol: string) => activeRepo.getTickerBySymbol(symbol),
  resolveTickerSymbol: (query: string) => activeRepo.resolveTickerSymbol(query),
  upsertTickers: (items: Parameters<DatabaseRepository['upsertTickers']>[0]) => activeRepo.upsertTickers(items),
  getAllTickers: (activeOnly?: boolean) => activeRepo.getAllTickers(activeOnly),

  importSnapshot: (snapshot: Parameters<DatabaseRepository['importSnapshot']>[0]) =>
    activeRepo.importSnapshot(snapshot),
  flushToDisk: () => activeRepo.flushToDisk(),
  reloadStoreFromDisk: async (customPath?: string) => {
    const storePathOverride = customPath || process.env.ALPHAQUANT_STORE_PATH?.trim();
    if (storePathOverride) {
      activeRepo = new InMemoryRepository({ filePath: storePathOverride });
      return;
    }
    await activeRepo.reloadStoreFromDisk(customPath);
  },
  getStoreFilePath: () => activeRepo.getStoreFilePath()
};
