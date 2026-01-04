import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import type { PortalProfile, PortalProfileInput } from '@/types/profile';

const DB_NAME = 'xtream-profiles.db';
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

const createProfileId = () => {
  const random = Math.floor(Math.random() * 1000000);
  return `${Date.now()}-${random}`;
};

type ProfileRow = {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  created_at: number;
  avatar_seed?: string | null;
};

const mapProfileRow = (row: ProfileRow): PortalProfile => ({
  id: String(row.id),
  profileName: String(row.name),
  host: String(row.host),
  username: String(row.username),
  password: String(row.password),
  createdAt: Number(row.created_at),
  avatarSeed: row.avatar_seed ?? null,
});

const ensureProfilesDb = async () => {
  if (isInitialized) {
    return;
  }
  await runSql(
    'CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, host TEXT NOT NULL, username TEXT NOT NULL, password TEXT NOT NULL, avatar_seed TEXT, created_at INTEGER NOT NULL);',
  );
  try {
    await runSql('ALTER TABLE profiles ADD COLUMN avatar_seed TEXT;');
  } catch {
    // Column already exists.
  }
  isInitialized = true;
};

export const initProfilesDb = async () => {
  await ensureProfilesDb();
};

export const getProfiles = async (): Promise<PortalProfile[]> => {
  await ensureProfilesDb();
  const db = getDb();
  const rows = await db.getAllAsync<ProfileRow>(
    'SELECT id, name, host, username, password, avatar_seed, created_at FROM profiles ORDER BY created_at ASC;',
  );
  return rows.map(mapProfileRow);
};

export const getProfileById = async (
  profileId: string,
): Promise<PortalProfile | null> => {
  await ensureProfilesDb();
  const db = getDb();
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT id, name, host, username, password, avatar_seed, created_at FROM profiles WHERE id = ? LIMIT 1;',
    [profileId],
  );
  return row ? mapProfileRow(row) : null;
};

export const getProfilesCount = async () => {
  await ensureProfilesDb();
  const db = getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM profiles;',
  );
  return Number(row?.count ?? 0);
};

export const addProfile = async (
  input: PortalProfileInput,
): Promise<PortalProfile> => {
  await ensureProfilesDb();
  const profile: PortalProfile = {
    id: createProfileId(),
    createdAt: Date.now(),
    ...input,
    avatarSeed: input.avatarSeed ?? null,
  };

  await runSql(
    'INSERT INTO profiles (id, name, host, username, password, avatar_seed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [
      profile.id,
      profile.profileName,
      profile.host,
      profile.username,
      profile.password,
      profile.avatarSeed ?? null,
      profile.createdAt,
    ],
  );

  return profile;
};

export const updateProfile = async (
  profileId: string,
  input: PortalProfileInput,
): Promise<PortalProfile> => {
  await ensureProfilesDb();
  await runSql(
    'UPDATE profiles SET name = ?, host = ?, username = ?, password = ?, avatar_seed = ? WHERE id = ?;',
    [
      input.profileName,
      input.host,
      input.username,
      input.password,
      input.avatarSeed ?? null,
      profileId,
    ],
  );
  const updated = await getProfileById(profileId);
  if (!updated) {
    throw new Error('Profile not found');
  }
  return updated;
};

export const removeProfile = async (profileId: string) => {
  await ensureProfilesDb();
  await runSql('DELETE FROM profiles WHERE id = ?;', [profileId]);
};

export const clearProfiles = async () => {
  await ensureProfilesDb();
  await runSql('DELETE FROM profiles;');
};
