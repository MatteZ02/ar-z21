/// <reference types="node" />
import {DatabaseSync} from 'node:sqlite';
import {SqlDatabase, SqlRunResult, SqlValue} from '../database';

// SqlDatabase on Node's built-in SQLite, for tests: the app's real SQL runs
// against a real (in-memory) SQLite database.
export const openTestDatabase = (): SqlDatabase => {
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (source: string) => {
      db.exec(source);
    },
    runAsync: async (
      source: string,
      ...params: SqlValue[]
    ): Promise<SqlRunResult> => {
      const result = db.prepare(source).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    getAllAsync: async <T>(source: string, ...params: SqlValue[]) =>
      db.prepare(source).all(...params) as T[],
    getFirstAsync: async <T>(source: string, ...params: SqlValue[]) =>
      (db.prepare(source).get(...params) as T | undefined) ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
};
