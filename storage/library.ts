import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export type LibraryItemType = 'live' | 'vod' | 'series';

export type LibraryItem = {
  itemId: string;
  itemType: LibraryItemType;
  updatedAt: number;
};

export type ContinueWatchingItem = LibraryItem & {
  positionSeconds: number;
  durationSeconds: number;
};

const DB_NAME = 'xtream-library.db';
let dbInstance: SQLiteDatabase | null = null;
let isInitialized = false;

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

export const initLibraryDb = async () => {
  if (isInitialized) {
    return;
  }
  const db = getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS favorites (
      profile_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS recently_viewed (
      profile_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS continue_watching (
      profile_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      position_seconds REAL NOT NULL,
      duration_seconds REAL NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, item_type, item_id)
    );
  `);
  isInitialized = true;
};

export const addFavorite = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
) => {
  await initLibraryDb();
  await runSql(
    'INSERT OR REPLACE INTO favorites (profile_id, item_type, item_id, updated_at) VALUES (?, ?, ?, ?);',
    [profileId, itemType, itemId, Date.now()],
  );
};

export const removeFavorite = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
) => {
  await initLibraryDb();
  await runSql(
    'DELETE FROM favorites WHERE profile_id = ? AND item_type = ? AND item_id = ?;',
    [profileId, itemType, itemId],
  );
};

export const isFavorite = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
): Promise<boolean> => {
  await initLibraryDb();
  const db = getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(1) as count FROM favorites WHERE profile_id = ? AND item_type = ? AND item_id = ?;',
    [profileId, itemType, itemId],
  );
  return Boolean(row?.count);
};

export const addRecentlyViewed = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
) => {
  await initLibraryDb();
  await runSql(
    'INSERT OR REPLACE INTO recently_viewed (profile_id, item_type, item_id, updated_at) VALUES (?, ?, ?, ?);',
    [profileId, itemType, itemId, Date.now()],
  );
};

export const upsertContinueWatching = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
  positionSeconds: number,
  durationSeconds: number,
) => {
  await initLibraryDb();
  await runSql(
    'INSERT OR REPLACE INTO continue_watching (profile_id, item_type, item_id, position_seconds, duration_seconds, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
    [profileId, itemType, itemId, positionSeconds, durationSeconds, Date.now()],
  );
};

export const removeContinueWatching = async (
  profileId: string,
  itemType: LibraryItemType,
  itemId: string,
) => {
  await initLibraryDb();
  await runSql(
    'DELETE FROM continue_watching WHERE profile_id = ? AND item_type = ? AND item_id = ?;',
    [profileId, itemType, itemId],
  );
};

export const getFavorites = async (
  profileId: string,
  limit = 10,
): Promise<LibraryItem[]> => {
  await initLibraryDb();
  const db = getDb();
  const rows = await db.getAllAsync<{
    item_type: string;
    item_id: string;
    updated_at: number;
  }>(
    'SELECT item_type, item_id, updated_at FROM favorites WHERE profile_id = ? ORDER BY updated_at DESC LIMIT ?;',
    [profileId, limit],
  );
  return rows.map((row) => ({
    itemId: row.item_id,
    itemType: row.item_type as LibraryItemType,
    updatedAt: row.updated_at,
  }));
};

export const getRecentlyViewed = async (
  profileId: string,
  limit = 10,
): Promise<LibraryItem[]> => {
  await initLibraryDb();
  const db = getDb();
  const rows = await db.getAllAsync<{
    item_type: string;
    item_id: string;
    updated_at: number;
  }>(
    'SELECT item_type, item_id, updated_at FROM recently_viewed WHERE profile_id = ? ORDER BY updated_at DESC LIMIT ?;',
    [profileId, limit],
  );
  return rows.map((row) => ({
    itemId: row.item_id,
    itemType: row.item_type as LibraryItemType,
    updatedAt: row.updated_at,
  }));
};

export const getContinueWatching = async (
  profileId: string,
  limit = 10,
): Promise<ContinueWatchingItem[]> => {
  await initLibraryDb();
  const db = getDb();
  const rows = await db.getAllAsync<{
    item_type: string;
    item_id: string;
    updated_at: number;
    position_seconds: number;
    duration_seconds: number;
  }>(
    'SELECT item_type, item_id, updated_at, position_seconds, duration_seconds FROM continue_watching WHERE profile_id = ? ORDER BY updated_at DESC LIMIT ?;',
    [profileId, limit],
  );
  return rows.map((row) => ({
    itemId: row.item_id,
    itemType: row.item_type as LibraryItemType,
    updatedAt: row.updated_at,
    positionSeconds: Number(row.position_seconds),
    durationSeconds: Number(row.duration_seconds),
  }));
};
