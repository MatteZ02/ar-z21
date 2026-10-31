import type {SQLiteStorage} from 'expo-sqlite/kv-store';
import {create} from 'zustand';
import {createJSONStorage, persist, StateStorage} from 'zustand/middleware';
import {DEFAULT_STOP_MODE, StopMode} from '../driving/globalStop';
import {DEFAULT_SPEED_STEPS, SpeedSteps, Z21_DEFAULT_PORT} from '../protocol';

// Brief §6.1.
export const DEFAULT_HOST = '192.168.0.111';

export type Settings = {
  host: string;
  port: number;
  stopMode: StopMode;
  // The library loco on the throttle, or null to drive a plain address
  // (locoAddress / locoSpeedSteps) that is not in the library.
  driveLocoId: number | null;
  locoAddress: number;
  locoSpeedSteps: SpeedSteps;
  // Library locos driven recently, latest first (quick-switch strip).
  recentLocoIds: number[];
};

type SettingsStore = Settings & {
  update: (changes: Partial<Settings>) => void;
};

type KeyValueStorage = Pick<
  SQLiteStorage,
  'getItemSync' | 'setItemSync' | 'removeItemSync'
>;

let backing: KeyValueStorage | null | undefined;

// Loaded on first use, not imported at the top: if the native SQLite module
// fails, the app must still start (the STOP button lives in it), only without
// remembering settings.
const getBacking = (): KeyValueStorage | null => {
  if (backing === undefined) {
    try {
      const kvStore = require('expo-sqlite/kv-store') as {
        default: KeyValueStorage;
      };
      backing = kvStore.default;
    } catch (error) {
      console.warn(
        'Settings storage unavailable; settings are not saved',
        error,
      );
      backing = null;
    }
  }
  return backing;
};

// Synchronous storage: settings are loaded before the first render, so the
// app can connect at start-up without waiting.
const storage: StateStorage = {
  getItem: (name) => getBacking()?.getItemSync(name) ?? null,
  setItem: (name, value) => {
    getBacking()?.setItemSync(name, value);
  },
  removeItem: (name) => {
    getBacking()?.removeItemSync(name);
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      host: DEFAULT_HOST,
      port: Z21_DEFAULT_PORT,
      stopMode: DEFAULT_STOP_MODE,
      driveLocoId: null,
      locoAddress: 3,
      locoSpeedSteps: DEFAULT_SPEED_STEPS,
      recentLocoIds: [],
      update: (changes) => {
        set(changes);
      },
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({update: _update, ...settings}) => settings,
    },
  ),
);
