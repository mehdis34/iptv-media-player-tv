import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'xtream-cache.db';
let dbInstance: SQLiteDatabase | null = null;

const getDb = () => {
  if (dbInstance) {
    return dbInstance;
  }
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web');
  }
  if (typeof openDatabaseSync !== 'function') {
    throw new Error('SQLite is not available in the current runtime');
  }
  dbInstance = openDatabaseSync(DB_NAME);
  return dbInstance;
};

const runSql = async (
  sql: string,
  params: Array<string | number | null> = [],
) => {
  const db = getDb();
  return db.runAsync(sql, params);
};

export type CacheRecord = {
  key: string;
  value: string;
  updatedAt: number;
};

// Call this once during app startup to ensure the cache table exists.
export const initCacheDb = async () => {
  await runSql(
    'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL);',
  );
};

export const setCacheItem = async (key: string, value: unknown) => {
  const payload = JSON.stringify(value);
  await runSql(
    'INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?);',
    [key, payload, Date.now()],
  );
};

export const getCacheItem = async <T>(
  key: string,
  maxAgeMs?: number,
): Promise<T | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ value: string; updated_at: number }>(
    'SELECT value, updated_at FROM cache WHERE key = ? LIMIT 1;',
    [key],
  );

  if (!row) {
    return null;
  }

  if (maxAgeMs != null && Date.now() - row.updated_at > maxAgeMs) {
    await removeCacheItem(key);
    return null;
  }

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
};

export const removeCacheItem = async (key: string) => {
  await runSql('DELETE FROM cache WHERE key = ?;', [key]);
};

export const clearCache = async () => {
  await runSql('DELETE FROM cache;');
};
