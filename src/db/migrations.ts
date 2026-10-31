import {SqlDatabase} from './database';

// Schema changes, in order. Each entry moves the database from version
// (index) to version (index + 1); PRAGMA user_version holds the current one.
// Never edit a released migration: add a new one.
export const MIGRATIONS: string[] = [
  // 1: loco library (Phase 3).
  `
  CREATE TABLE locos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address INTEGER NOT NULL,
    speed_steps INTEGER NOT NULL DEFAULT 128,
    max_speed INTEGER NOT NULL DEFAULT 100,
    speed_display TEXT NOT NULL DEFAULT 'kmh',
    photo TEXT,
    notes TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL DEFAULT '',
    railway TEXT NOT NULL DEFAULT '',
    article_number TEXT NOT NULL DEFAULT '',
    decoder_type TEXT NOT NULL DEFAULT '',
    build_year TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL
  );
  CREATE TABLE loco_functions (
    loco_id INTEGER NOT NULL REFERENCES locos(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'none',
    momentary INTEGER NOT NULL DEFAULT 0,
    slot INTEGER NOT NULL,
    PRIMARY KEY (loco_id, number)
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

// Brings the database up to SCHEMA_VERSION. Each step runs in a transaction
// together with its version bump, so a failed step leaves the old version.
export const migrate = async (db: SqlDatabase): Promise<void> => {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{user_version: number}>(
    'PRAGMA user_version',
  );
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(
      `Database version ${current} is newer than this app (${SCHEMA_VERSION}).`,
    );
  }
  for (let version = current; version < SCHEMA_VERSION; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1};`);
    });
  }
};
