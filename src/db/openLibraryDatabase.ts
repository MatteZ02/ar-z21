import * as SQLite from 'expo-sqlite';
import {SqlDatabase} from './database';
import {migrate} from './migrations';

const DATABASE_NAME = 'library.db';

// The app's only database file, brought up to date before first use.
export const openLibraryDatabase = async (): Promise<SqlDatabase> => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
};
