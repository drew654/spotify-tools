import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR ?? process.cwd();

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'spotify_log.db');

let _db: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    initSchema(_db);
  }
  return _db;
}

const initSchema = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plays (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id    TEXT NOT NULL,
      track_name  TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name  TEXT,
      album_art   TEXT,
      played_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Play history ────────────────────────────────────────────────────────────

export interface Play {
  id: number;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  album_art: string | null;
  played_at: string;
}

export const logPlay = (play: Omit<Play, 'id'>): void => {
  const db = getDb();
  db.prepare(`
    INSERT INTO plays (track_id, track_name, artist_name, album_name, album_art, played_at)
    VALUES (@track_id, @track_name, @artist_name, @album_name, @album_art, @played_at)
  `).run(play);
}

export const getRecentPlays = (limit = 50, offset = 0): Play[] => {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM plays
    ORDER BY played_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Play[];
}

export const getTotalPlayCount = (): number => {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM plays').get() as { cnt: number };
  return row.cnt;
}

export const getRecentTrackIds = (limit: number): string[] => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT track_id FROM plays
    ORDER BY played_at DESC
    LIMIT ?
  `).all(limit) as { track_id: string }[];
  return rows.map(r => r.track_id);
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export const getToken = (key: string): string | null => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM tokens WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
};

export const saveToken = (key: string, value: string): void => {
  const db = getDb();
  db.prepare(`
    INSERT INTO tokens (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
};

export const clearTokens = (): void => {
  const db = getDb();
  db.prepare('DELETE FROM tokens').run();
};

// ─── Config ──────────────────────────────────────────────────────────────────

export const getConfig = (key: string): string | null => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export const saveConfig = (key: string, value: string): void => {
  const db = getDb();
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}
