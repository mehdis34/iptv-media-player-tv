import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import type {
  XtreamCategory,
  XtreamLiveStream,
  XtreamSeriesInfoResponse,
  XtreamSeriesItem,
  XtreamVodInfoResponse,
  XtreamVodStream,
} from '@/types/xtream';
import type { XtreamXmltvPayload } from '@/storage/xtream';

const DB_NAME = 'xtream-catalog.db';
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

const toNullableString = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

const toStringId = (value: unknown) => String(value ?? '');

export const initCatalogDb = async () => {
  const db = getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS catalog_meta (
      profile_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, key)
    );

    CREATE TABLE IF NOT EXISTS categories (
      profile_id TEXT NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      parent_id TEXT,
      PRIMARY KEY (profile_id, type, category_id)
    );

    CREATE TABLE IF NOT EXISTS live_streams (
      profile_id TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      stream_icon TEXT,
      stream_type TEXT,
      epg_channel_id TEXT,
      epg_id TEXT,
      tv_archive TEXT,
      tv_archive_duration TEXT,
      data TEXT NOT NULL,
      PRIMARY KEY (profile_id, stream_id)
    );

    CREATE TABLE IF NOT EXISTS vod_streams (
      profile_id TEXT NOT NULL,
      vod_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      stream_icon TEXT,
      rating TEXT,
      rating_5based TEXT,
      container_extension TEXT,
      added TEXT,
      data TEXT NOT NULL,
      PRIMARY KEY (profile_id, vod_id)
    );

    CREATE TABLE IF NOT EXISTS vod_info (
      profile_id TEXT NOT NULL,
      vod_id TEXT NOT NULL,
      info TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, vod_id)
    );

    CREATE TABLE IF NOT EXISTS series (
      profile_id TEXT NOT NULL,
      series_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      cover TEXT,
      rating TEXT,
      last_modified TEXT,
      data TEXT NOT NULL,
      PRIMARY KEY (profile_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS series_info (
      profile_id TEXT NOT NULL,
      series_id TEXT NOT NULL,
      info TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS epg_channels (
      profile_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      PRIMARY KEY (profile_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS epg_listings (
      profile_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      title TEXT,
      description TEXT,
      category TEXT,
      PRIMARY KEY (profile_id, channel_id, start, end, title)
    );
  `);
  try {
    await db.execAsync('ALTER TABLE live_streams ADD COLUMN epg_id TEXT;');
  } catch {
    // Column already exists.
  }
};

export const clearCatalogForProfile = async (profileId: string) => {
  const db = getDb();
  const tables = [
    'categories',
    'live_streams',
    'vod_streams',
    'vod_info',
    'series',
    'series_info',
    'epg_channels',
    'epg_listings',
    'catalog_meta',
  ];

  await db.withTransactionAsync(async () => {
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table} WHERE profile_id = ?;`, [
        profileId,
      ]);
    }
  });
};

export const setCatalogMeta = async (
  profileId: string,
  key: string,
  value: string,
) => {
  const db = getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO catalog_meta (profile_id, key, value, updated_at) VALUES (?, ?, ?, ?);',
    [profileId, key, value, Date.now()],
  );
};

export const getCatalogMeta = async (profileId: string, key: string) => {
  const db = getDb();
  return db.getFirstAsync<{ value: string; updated_at: number }>(
    'SELECT value, updated_at FROM catalog_meta WHERE profile_id = ? AND key = ? LIMIT 1;',
    [profileId, key],
  );
};

export const storeCategories = async (
  profileId: string,
  type: string,
  categories: XtreamCategory[],
) => {
  if (categories.length === 0) {
    return;
  }
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO categories (profile_id, type, category_id, category_name, parent_id) VALUES (?, ?, ?, ?, ?);',
    );
    try {
      for (const category of categories) {
        await stmt.executeAsync([
          profileId,
          type,
          toStringId(category.category_id),
          category.category_name ?? '',
          toNullableString(category.parent_id),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
};

export const storeLiveStreams = async (
  profileId: string,
  streams: XtreamLiveStream[],
) => {
  if (streams.length === 0) {
    return;
  }
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO live_streams (profile_id, stream_id, name, category_id, stream_icon, stream_type, epg_channel_id, epg_id, tv_archive, tv_archive_duration, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    );
    try {
      for (const stream of streams) {
        await stmt.executeAsync([
          profileId,
          toStringId(stream.stream_id),
          stream.name ?? '',
          toNullableString(stream.category_id),
          toNullableString(stream.stream_icon),
          toNullableString(stream.stream_type),
          toNullableString(stream.epg_channel_id),
          toNullableString(stream.epg_id),
          toNullableString(stream.tv_archive),
          toNullableString(stream.tv_archive_duration),
          JSON.stringify(stream),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
};

export type HomeCatalogItem = {
  id: string;
  title: string;
  image: string | null;
  type: 'live' | 'vod' | 'series';
  epgChannelId?: string | null;
};

export type VodCategory = {
  id: string;
  name: string;
};

export type VodItem = {
  id: string;
  title: string;
  image: string | null;
  categoryId?: string | null;
};

export type LiveCategory = {
  id: string;
  name: string;
};

export type SeriesCategory = {
  id: string;
  name: string;
};

export type SeriesItem = {
  id: string;
  title: string;
  image: string | null;
  categoryId?: string | null;
};

export type HomeEpgListing = {
  channelId: string;
  title: string;
  start: string;
  end: string;
  description?: string | null;
};

export type EpgChannelRow = {
  channelId: string;
  displayName: string;
  normalizedName: string;
};

export const getEpgChannels = async (
  profileId: string,
): Promise<EpgChannelRow[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    channel_id: string | number;
    display_name: string | number | null;
    normalized_name: string | number | null;
  }>(
    'SELECT channel_id, display_name, normalized_name FROM epg_channels WHERE profile_id = ?;',
    [profileId],
  );
  return rows.map((row) => ({
    channelId: String(row.channel_id),
    displayName: String(row.display_name ?? ''),
    normalizedName: String(row.normalized_name ?? ''),
  }));
};

export const getEpgChannelIdByNormalizedNames = async (
  profileId: string,
  normalizedNames: string[],
): Promise<Map<string, string>> => {
  if (normalizedNames.length === 0) {
    return new Map();
  }
  const db = getDb();
  const placeholders = normalizedNames.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    channel_id: string | number;
    normalized_name: string | number;
  }>(
    `SELECT channel_id, normalized_name FROM epg_channels WHERE profile_id = ? AND normalized_name IN (${placeholders});`,
    [profileId, ...normalizedNames],
  );
  return new Map(
    rows.map((row) => [String(row.normalized_name), String(row.channel_id)]),
  );
};

export const getEpgChannelIdForNormalizedName = async (
  profileId: string,
  normalizedName: string,
): Promise<string | null> => {
  if (!normalizedName) {
    return null;
  }
  const db = getDb();
  const row = await db.getFirstAsync<{
    channel_id: string | number;
    normalized_name: string | number;
  }>(
    `SELECT channel_id, normalized_name
     FROM epg_channels
     WHERE profile_id = ?
       AND normalized_name <> ''
       AND (
         normalized_name = ?
         OR instr(?, normalized_name) > 0
         OR instr(normalized_name, ?) > 0
       )
     ORDER BY LENGTH(normalized_name) DESC
     LIMIT 1;`,
    [profileId, normalizedName, normalizedName, normalizedName],
  );
  return row?.channel_id != null ? String(row.channel_id) : null;
};

export const getEpgChannelIdFromListings = async (
  profileId: string,
  normalizedName: string,
): Promise<string | null> => {
  if (!normalizedName) {
    return null;
  }
  const db = getDb();
  const row = await db.getFirstAsync<{
    channel_id: string | number;
  }>(
    `
      SELECT channel_id
      FROM (
        SELECT
          channel_id,
          lower(
            replace(
              replace(
                replace(
                  replace(
                    replace(channel_id, '.', ''),
                    '-',
                    ''
                  ),
                  '_',
                  ''
                ),
                ' ',
                ''
              ),
              '/',
              ''
            )
          ) AS normalized
        FROM epg_listings
        WHERE profile_id = ?
        GROUP BY channel_id
      )
      WHERE normalized <> ''
        AND (
          normalized = ?
          OR instr(?, normalized) > 0
          OR instr(normalized, ?) > 0
        )
      ORDER BY LENGTH(normalized) DESC
      LIMIT 1;
    `,
    [profileId, normalizedName, normalizedName, normalizedName],
  );
  return row?.channel_id != null ? String(row.channel_id) : null;
};

export const getPrimaryLiveCategoryId = async (
  profileId: string,
): Promise<string | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ category_id: string | number }>(
    'SELECT category_id FROM categories WHERE profile_id = ? AND type = ? ORDER BY rowid ASC LIMIT 1;',
    [profileId, 'live'],
  );
  const raw = row?.category_id;
  if (raw == null) {
    return null;
  }
  const value = String(raw).trim().toLowerCase();
  if (!value || value === 'all' || value === '0') {
    return null;
  }
  return value;
};

export const getRecentLiveItems = async (
  profileId: string,
  limit = 10,
  categoryId?: string | null,
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const where = [
    'profile_id = ?',
    'stream_icon IS NOT NULL',
    "TRIM(stream_icon) <> ''",
  ];
  const params: Array<string | number> = [profileId];
  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }
  const rows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `SELECT stream_id, name, stream_icon, epg_channel_id, epg_id FROM live_streams WHERE ${where.join(
      ' AND ',
    )} ORDER BY CAST(stream_id AS INTEGER) DESC, name ASC LIMIT ?;`,
    [...params, limit],
  );
  return rows.map((row) => ({
    id: row.stream_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    type: 'live',
    epgChannelId:
      row.epg_channel_id != null
        ? String(row.epg_channel_id)
        : row.epg_id != null
          ? String(row.epg_id)
          : null,
  }));
};

const normalizeNameSql =
  "lower(replace(replace(replace(replace(replace(name, '.', ''), '-', ''), '_', ''), ' ', ''), '/', ''))";

const formatNowKey = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const getLiveItemsWithCurrentEpg = async (
  profileId: string,
  limit = 10,
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const nowKey = formatNowKey();
  const channelRows = await db.getAllAsync<{
    channel_id: string | number;
  }>(
    `
      SELECT DISTINCT channel_id
      FROM epg_listings
      WHERE profile_id = ?
        AND substr(start, 1, 14) <= ?
        AND substr(end, 1, 14) >= ?
      ORDER BY RANDOM()
      LIMIT ?;
    `,
    [profileId, nowKey, nowKey, limit * 6],
  );
  const channelIds = Array.from(
    new Set(channelRows.map((row) => String(row.channel_id)).filter(Boolean)),
  );
  if (channelIds.length === 0) {
    return [];
  }

  const placeholders = channelIds.map(() => '?').join(',');
  const directRows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `
      SELECT stream_id, name, stream_icon, epg_channel_id, epg_id
      FROM live_streams
      WHERE profile_id = ?
        AND stream_icon IS NOT NULL
        AND TRIM(stream_icon) <> ''
        AND (
          epg_channel_id IN (${placeholders})
          OR epg_id IN (${placeholders})
        )
      ORDER BY RANDOM()
      LIMIT ?;
    `,
    [profileId, ...channelIds, ...channelIds, limit],
  );

  const seen = new Set<string>();
  const results: HomeCatalogItem[] = directRows.map((row) => {
    seen.add(row.stream_id);
    const channelId =
      row.epg_channel_id != null
        ? String(row.epg_channel_id)
        : row.epg_id != null
          ? String(row.epg_id)
          : null;
    return {
      id: row.stream_id,
      title: row.name ?? '',
      image: row.stream_icon ?? null,
      type: 'live',
      epgChannelId: channelId,
    };
  });

  if (results.length >= limit) {
    return results.slice(0, limit);
  }

  const channels = await getEpgChannels(profileId);
  const normalizedMap = new Map<string, string>();
  channels.forEach((channel) => {
    const normalized = String(channel.normalizedName ?? '').trim();
    if (normalized && !normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, channel.channelId);
    }
  });
  channelIds.forEach((channelId) => {
    const normalized = String(channelId)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    if (normalized && !normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, channelId);
    }
  });
  const normalizedNames = Array.from(normalizedMap.keys());
  if (normalizedNames.length === 0) {
    return results;
  }

  const namePlaceholders = normalizedNames.map(() => '?').join(',');
  const nameRows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `
      SELECT stream_id, name, stream_icon, epg_channel_id, epg_id
      FROM live_streams
      WHERE profile_id = ?
        AND stream_icon IS NOT NULL
        AND TRIM(stream_icon) <> ''
        AND ${normalizeNameSql} IN (${namePlaceholders})
      ORDER BY RANDOM()
      LIMIT ?;
    `,
    [profileId, ...normalizedNames, limit * 2],
  );

  for (const row of nameRows) {
    if (results.length >= limit) {
      break;
    }
    if (seen.has(row.stream_id)) {
      continue;
    }
    const normalized = String(row.name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    const mappedChannelId = normalizedMap.get(normalized);
    if (!mappedChannelId) {
      continue;
    }
    seen.add(row.stream_id);
    results.push({
      id: row.stream_id,
      title: row.name ?? '',
      image: row.stream_icon ?? null,
      type: 'live',
      epgChannelId:
        row.epg_channel_id != null
          ? String(row.epg_channel_id)
          : row.epg_id != null
            ? String(row.epg_id)
            : mappedChannelId,
    });
  }

  return results.slice(0, limit);
};

export const getRecentVodItems = async (
  profileId: string,
  limit = 10,
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    vod_id: string;
    name: string;
    stream_icon?: string | null;
  }>(
    'SELECT vod_id, name, stream_icon FROM vod_streams WHERE profile_id = ? ORDER BY CAST(added AS INTEGER) DESC, vod_id DESC LIMIT ?;',
    [profileId, limit],
  );
  return rows.map((row) => ({
    id: row.vod_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    type: 'vod',
  }));
};

export const getVodCategories = async (
  profileId: string,
): Promise<VodCategory[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    category_id: string | number;
    category_name: string | number | null;
  }>(
    'SELECT category_id, category_name FROM categories WHERE profile_id = ? AND type = ? ORDER BY rowid ASC;',
    [profileId, 'vod'],
  );
  return rows.map((row) => ({
    id: String(row.category_id),
    name: String(row.category_name ?? ''),
  }));
};

export const getLiveCategories = async (
  profileId: string,
): Promise<LiveCategory[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    category_id: string | number;
    category_name: string | number | null;
  }>(
    'SELECT category_id, category_name FROM categories WHERE profile_id = ? AND type = ? ORDER BY rowid ASC;',
    [profileId, 'live'],
  );
  return rows.map((row) => ({
    id: String(row.category_id),
    name: String(row.category_name ?? ''),
  }));
};

export const getLivePage = async (
  profileId: string,
  limit: number,
  offset: number,
  categoryId?: string | null,
  options?: { includeMissingIcons?: boolean },
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const includeMissingIcons = options?.includeMissingIcons ?? false;
  const where = ['profile_id = ?'];
  const params: Array<string | number | null> = [profileId];
  if (!includeMissingIcons) {
    where.push('stream_icon IS NOT NULL', "TRIM(stream_icon) <> ''");
  }
  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }
  params.push(limit, offset);
  const rows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `SELECT stream_id, name, stream_icon, epg_channel_id, epg_id FROM live_streams WHERE ${where.join(
      ' AND ',
    )} ORDER BY rowid ASC LIMIT ? OFFSET ?;`,
    params,
  );
  return rows.map((row) => ({
    id: row.stream_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    type: 'live',
    epgChannelId:
      row.epg_channel_id != null
        ? String(row.epg_channel_id)
        : row.epg_id != null
          ? String(row.epg_id)
          : null,
  }));
};

export const getLiveChannelOffset = async (
  profileId: string,
  streamId: string,
): Promise<number | null> => {
  const db = getDb();
  const target = await db.getFirstAsync<{ rowid: number }>(
    'SELECT rowid FROM live_streams WHERE profile_id = ? AND stream_id = ?;',
    [profileId, streamId],
  );
  if (!target?.rowid) {
    return null;
  }
  const row = await db.getFirstAsync<{ offset: number }>(
    'SELECT COUNT(*) as offset FROM live_streams WHERE profile_id = ? AND rowid < ?;',
    [profileId, target.rowid],
  );
  if (!row || row.offset == null) {
    return null;
  }
  return Number(row.offset);
};

export type VodSortKey = 'recent' | 'oldest' | 'az' | 'za';

export const getVodPage = async (
  profileId: string,
  limit: number,
  offset: number,
  sort: VodSortKey,
  categoryId?: string | null,
): Promise<VodItem[]> => {
  const db = getDb();
  const orderBy =
    sort === 'az'
      ? 'name COLLATE NOCASE ASC'
      : sort === 'za'
        ? 'name COLLATE NOCASE DESC'
        : sort === 'oldest'
          ? 'CAST(added AS INTEGER) ASC, vod_id ASC'
          : 'CAST(added AS INTEGER) DESC, vod_id DESC';
  const where: string[] = ['profile_id = ?'];
  const params: Array<string | number | null> = [profileId];
  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }
  params.push(limit, offset);
  const rows = await db.getAllAsync<{
    vod_id: string;
    name: string;
    stream_icon?: string | null;
    category_id?: string | number | null;
  }>(
    `SELECT vod_id, name, stream_icon, category_id FROM vod_streams WHERE ${where.join(
      ' AND ',
    )} ORDER BY ${orderBy} LIMIT ? OFFSET ?;`,
    params,
  );
  return rows.map((row) => ({
    id: row.vod_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    categoryId:
      row.category_id != null ? String(row.category_id) : null,
  }));
};

export const searchLiveStreams = async (
  profileId: string,
  query: string,
  limit = 20,
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const pattern = `%${query.toLowerCase()}%`;
  const rows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `
      SELECT stream_id, name, stream_icon, epg_channel_id, epg_id
      FROM live_streams
      WHERE profile_id = ?
        AND lower(name) LIKE ?
      ORDER BY name COLLATE NOCASE ASC
      LIMIT ?;
    `,
    [profileId, pattern, limit],
  );
  return rows.map((row) => ({
    id: row.stream_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    type: 'live',
    epgChannelId:
      row.epg_channel_id != null
        ? String(row.epg_channel_id)
        : row.epg_id != null
          ? String(row.epg_id)
          : null,
  }));
};

export const searchVodStreams = async (
  profileId: string,
  query: string,
  limit = 20,
): Promise<VodItem[]> => {
  const db = getDb();
  const pattern = `%${query.toLowerCase()}%`;
  const rows = await db.getAllAsync<{
    vod_id: string;
    name: string;
    stream_icon?: string | null;
    category_id?: string | number | null;
  }>(
    `
      SELECT vod_id, name, stream_icon, category_id
      FROM vod_streams
      WHERE profile_id = ?
        AND lower(name) LIKE ?
      ORDER BY name COLLATE NOCASE ASC
      LIMIT ?;
    `,
    [profileId, pattern, limit],
  );
  return rows.map((row) => ({
    id: row.vod_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    categoryId: row.category_id != null ? String(row.category_id) : null,
  }));
};

export const searchSeriesItems = async (
  profileId: string,
  query: string,
  limit = 20,
): Promise<SeriesItem[]> => {
  const db = getDb();
  const pattern = `%${query.toLowerCase()}%`;
  const rows = await db.getAllAsync<{
    series_id: string;
    name: string;
    cover?: string | null;
    category_id?: string | number | null;
  }>(
    `
      SELECT series_id, name, cover, category_id
      FROM series
      WHERE profile_id = ?
        AND lower(name) LIKE ?
      ORDER BY name COLLATE NOCASE ASC
      LIMIT ?;
    `,
    [profileId, pattern, limit],
  );
  return rows.map((row) => ({
    id: row.series_id,
    title: row.name ?? '',
    image: row.cover ?? null,
    categoryId: row.category_id != null ? String(row.category_id) : null,
  }));
};

export const getVodSimilar = async (
  profileId: string,
  categoryId: string,
  excludeId?: string | null,
  limit = 10,
): Promise<VodItem[]> => {
  const db = getDb();
  const where: string[] = ['profile_id = ?', 'category_id = ?'];
  const params: Array<string | number | null> = [profileId, categoryId];
  if (excludeId) {
    where.push('vod_id != ?');
    params.push(excludeId);
  }
  params.push(limit);
  const rows = await db.getAllAsync<{
    vod_id: string;
    name: string;
    stream_icon?: string | null;
    category_id?: string | number | null;
  }>(
    `SELECT vod_id, name, stream_icon, category_id FROM vod_streams WHERE ${where.join(
      ' AND ',
    )} ORDER BY CAST(added AS INTEGER) DESC, vod_id DESC LIMIT ?;`,
    params,
  );
  return rows.map((row) => ({
    id: row.vod_id,
    title: row.name ?? '',
    image: row.stream_icon ?? null,
    categoryId: row.category_id != null ? String(row.category_id) : null,
  }));
};

export const getSeriesCategories = async (
  profileId: string,
): Promise<SeriesCategory[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    category_id: string | number;
    category_name: string | number | null;
  }>(
    'SELECT category_id, category_name FROM categories WHERE profile_id = ? AND type = ? ORDER BY rowid ASC;',
    [profileId, 'series'],
  );
  return rows.map((row) => ({
    id: String(row.category_id),
    name: String(row.category_name ?? ''),
  }));
};

export type SeriesSortKey = 'recent' | 'oldest' | 'az' | 'za';

export const getSeriesPage = async (
  profileId: string,
  limit: number,
  offset: number,
  sort: SeriesSortKey,
  categoryId?: string | null,
): Promise<SeriesItem[]> => {
  const db = getDb();
  const orderBy =
    sort === 'az'
      ? 'name COLLATE NOCASE ASC'
      : sort === 'za'
        ? 'name COLLATE NOCASE DESC'
        : sort === 'oldest'
          ? 'CAST(last_modified AS INTEGER) ASC, series_id ASC'
          : 'CAST(last_modified AS INTEGER) DESC, series_id DESC';
  const where: string[] = ['profile_id = ?'];
  const params: Array<string | number | null> = [profileId];
  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }
  params.push(limit, offset);
  const rows = await db.getAllAsync<{
    series_id: string;
    name: string;
    cover?: string | null;
    category_id?: string | number | null;
  }>(
    `SELECT series_id, name, cover, category_id FROM series WHERE ${where.join(
      ' AND ',
    )} ORDER BY ${orderBy} LIMIT ? OFFSET ?;`,
    params,
  );
  return rows.map((row) => ({
    id: row.series_id,
    title: row.name ?? '',
    image: row.cover ?? null,
    categoryId:
      row.category_id != null ? String(row.category_id) : null,
  }));
};

export const getSeriesSimilar = async (
  profileId: string,
  categoryId: string,
  excludeId?: string | null,
  limit = 10,
): Promise<SeriesItem[]> => {
  const db = getDb();
  const where: string[] = ['profile_id = ?', 'category_id = ?'];
  const params: Array<string | number | null> = [profileId, categoryId];
  if (excludeId) {
    where.push('series_id != ?');
    params.push(excludeId);
  }
  params.push(limit);
  const rows = await db.getAllAsync<{
    series_id: string;
    name: string;
    cover?: string | null;
    category_id?: string | number | null;
  }>(
    `SELECT series_id, name, cover, category_id FROM series WHERE ${where.join(
      ' AND ',
    )} ORDER BY CAST(last_modified AS INTEGER) DESC, series_id DESC LIMIT ?;`,
    params,
  );
  return rows.map((row) => ({
    id: row.series_id,
    title: row.name ?? '',
    image: row.cover ?? null,
    categoryId: row.category_id != null ? String(row.category_id) : null,
  }));
};

export const getRecentSeriesItems = async (
  profileId: string,
  limit = 10,
): Promise<HomeCatalogItem[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<{
    series_id: string;
    name: string;
    cover?: string | null;
  }>(
    'SELECT series_id, name, cover FROM series WHERE profile_id = ? ORDER BY CAST(last_modified AS INTEGER) DESC, series_id DESC LIMIT ?;',
    [profileId, limit],
  );
  return rows.map((row) => ({
    id: row.series_id,
    title: row.name ?? '',
    image: row.cover ?? null,
    type: 'series',
  }));
};

export const getEpgListingsForChannels = async (
  profileId: string,
  channelIds: string[],
): Promise<HomeEpgListing[]> => {
  if (channelIds.length === 0) {
    return [];
  }
  const db = getDb();
  const placeholders = channelIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    channel_id: string;
    title?: string | null;
    description?: string | null;
    start: string;
    end: string;
  }>(
    `SELECT channel_id, title, description, start, end FROM epg_listings WHERE profile_id = ? AND channel_id IN (${placeholders});`,
    [profileId, ...channelIds],
  );
  return rows.map((row) => ({
    channelId: row.channel_id,
    title: row.title ?? '',
    start: row.start,
    end: row.end,
    description: row.description ?? null,
  }));
};

export const getLiveItemsByIds = async (
  profileId: string,
  ids: string[],
): Promise<HomeCatalogItem[]> => {
  if (ids.length === 0) {
    return [];
  }
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    stream_id: string;
    name: string;
    stream_icon?: string | null;
    epg_channel_id?: string | number | null;
    epg_id?: string | number | null;
  }>(
    `SELECT stream_id, name, stream_icon, epg_channel_id, epg_id FROM live_streams WHERE profile_id = ? AND stream_id IN (${placeholders});`,
    [profileId, ...ids],
  );
  const byId = new Map(
    rows.map((row) => [
      row.stream_id,
      {
        id: row.stream_id,
        title: row.name ?? '',
        image: row.stream_icon ?? null,
        type: 'live' as const,
        epgChannelId:
          row.epg_channel_id != null
            ? String(row.epg_channel_id)
            : row.epg_id != null
              ? String(row.epg_id)
              : null,
      },
    ]),
  );
  return ids.map((id) => byId.get(id)).filter(Boolean) as HomeCatalogItem[];
};

export const getVodItemsByIds = async (
  profileId: string,
  ids: string[],
): Promise<HomeCatalogItem[]> => {
  if (ids.length === 0) {
    return [];
  }
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    vod_id: string;
    name: string;
    stream_icon?: string | null;
  }>(
    `SELECT vod_id, name, stream_icon FROM vod_streams WHERE profile_id = ? AND vod_id IN (${placeholders});`,
    [profileId, ...ids],
  );
  const byId = new Map(
    rows.map((row) => [
      row.vod_id,
      {
        id: row.vod_id,
        title: row.name ?? '',
        image: row.stream_icon ?? null,
        type: 'vod' as const,
      },
    ]),
  );
  return ids.map((id) => byId.get(id)).filter(Boolean) as HomeCatalogItem[];
};

export const getSeriesItemsByIds = async (
  profileId: string,
  ids: string[],
): Promise<HomeCatalogItem[]> => {
  if (ids.length === 0) {
    return [];
  }
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<{
    series_id: string;
    name: string;
    cover?: string | null;
  }>(
    `SELECT series_id, name, cover FROM series WHERE profile_id = ? AND series_id IN (${placeholders});`,
    [profileId, ...ids],
  );
  const byId = new Map(
    rows.map((row) => [
      row.series_id,
      {
        id: row.series_id,
        title: row.name ?? '',
        image: row.cover ?? null,
        type: 'series' as const,
      },
    ]),
  );
  return ids.map((id) => byId.get(id)).filter(Boolean) as HomeCatalogItem[];
};

export const storeVodStreams = async (
  profileId: string,
  vodStreams: XtreamVodStream[],
) => {
  if (vodStreams.length === 0) {
    return;
  }
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO vod_streams (profile_id, vod_id, name, category_id, stream_icon, rating, rating_5based, container_extension, added, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    );
    try {
      for (const vod of vodStreams) {
        await stmt.executeAsync([
          profileId,
          toStringId(vod.stream_id),
          vod.name ?? '',
          toNullableString(vod.category_id),
          toNullableString(vod.stream_icon),
          toNullableString(vod.rating),
          toNullableString(vod.rating_5based),
          toNullableString(vod.container_extension),
          toNullableString(vod.added),
          JSON.stringify(vod),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
};

export const storeVodInfo = async (
  profileId: string,
  vodId: string,
  info: XtreamVodInfoResponse,
) => {
  const db = getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO vod_info (profile_id, vod_id, info, updated_at) VALUES (?, ?, ?, ?);',
    [profileId, vodId, JSON.stringify(info), Date.now()],
  );
};

export const getVodInfo = async (
  profileId: string,
  vodId: string,
): Promise<XtreamVodInfoResponse | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ info: string }>(
    'SELECT info FROM vod_info WHERE profile_id = ? AND vod_id = ? LIMIT 1;',
    [profileId, vodId],
  );
  if (!row?.info) {
    return null;
  }
  try {
    return JSON.parse(row.info) as XtreamVodInfoResponse;
  } catch {
    return null;
  }
};

export const getSeriesInfo = async (
  profileId: string,
  seriesId: string,
): Promise<XtreamSeriesInfoResponse | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ info: string }>(
    'SELECT info FROM series_info WHERE profile_id = ? AND series_id = ? LIMIT 1;',
    [profileId, seriesId],
  );
  if (!row?.info) {
    return null;
  }
  try {
    return JSON.parse(row.info) as XtreamSeriesInfoResponse;
  } catch {
    return null;
  }
};

export const storeSeries = async (
  profileId: string,
  series: XtreamSeriesItem[],
) => {
  if (series.length === 0) {
    return;
  }
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO series (profile_id, series_id, name, category_id, cover, rating, last_modified, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
    );
    try {
      for (const item of series) {
        await stmt.executeAsync([
          profileId,
          toStringId(item.series_id),
          item.name ?? '',
          toNullableString(item.category_id),
          toNullableString(item.cover),
          toNullableString(item.rating),
          toNullableString(item.last_modified),
          JSON.stringify(item),
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
};

export const storeSeriesInfo = async (
  profileId: string,
  seriesId: string,
  info: XtreamSeriesInfoResponse,
) => {
  const db = getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO series_info (profile_id, series_id, info, updated_at) VALUES (?, ?, ?, ?);',
    [profileId, seriesId, JSON.stringify(info), Date.now()],
  );
};

export const storeEpg = async (profileId: string, payload: XtreamXmltvPayload) => {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const channelStmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO epg_channels (profile_id, channel_id, display_name, normalized_name) VALUES (?, ?, ?, ?);',
    );
    const listingStmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO epg_listings (profile_id, channel_id, start, end, title, description, category) VALUES (?, ?, ?, ?, ?, ?, ?);',
    );
    try {
      for (const channel of payload.channels) {
        await channelStmt.executeAsync([
          profileId,
          channel.channelId,
          channel.displayName ?? '',
          channel.normalizedName ?? '',
        ]);
      }

      for (const listing of payload.listings) {
        if (!listing.channelId || !listing.start || !listing.end) {
          continue;
        }
        await listingStmt.executeAsync([
          profileId,
          listing.channelId,
          listing.start,
          listing.end,
          listing.title ?? '',
          listing.description ?? '',
          listing.category ?? '',
        ]);
      }
    } finally {
      await channelStmt.finalizeAsync();
      await listingStmt.finalizeAsync();
    }
  });
};

export const clearEpgForProfile = async (profileId: string) => {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM epg_listings WHERE profile_id = ?;', [
      profileId,
    ]);
    await db.runAsync('DELETE FROM epg_channels WHERE profile_id = ?;', [
      profileId,
    ]);
  });
};
