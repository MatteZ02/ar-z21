// The parts of expo-sqlite's SQLiteDatabase the app uses. Tests implement it
// with node:sqlite (testUtils/nodeSqlite.ts), so the SQL itself is tested.
export type SqlValue = string | number | null;

export type SqlRunResult = {lastInsertRowId: number; changes: number};

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
