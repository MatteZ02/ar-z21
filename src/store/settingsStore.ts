import type {SQLiteStorage} from 'expo-sqlite/kv-store';
import {create} from 'zustand';
import {createJSONStorage, persist, StateStorage} from 'zustand/middleware';
import {DEFAULT_STOP_MODE, StopMode} from '../driving/globalStop';
import {withRecent} from '../library/recent';
import {SpeedSteps, Z21_DEFAULT_PORT} from '../protocol';
import {
  DEFAULT_THROTTLES,
  migrateSettings,
  ThrottleIndex,
  ThrottleSelection,
  withoutLoco,
  withSelection,
} from './throttleSelection';

// Brief §6.1.
export const DEFAULT_HOST = '192.168.0.111';

export type Settings = {
  host: string;
  port: number;
  stopMode: StopMode;
  // What each throttle drives (index: ThrottleIndex).
  throttles: ThrottleSelection[];
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
      throttles: DEFAULT_THROTTLES,
      recentLocoIds: [],
      update: (changes) => {
        set(changes);
      },
    }),
    {
      name: 'settings',
      version: 2,
      storage: createJSONStorage(() => storage),
      partialize: ({update: _update, ...settings}) => settings,
      migrate: (persisted, version) =>
        migrateSettings(persisted, version) as unknown as SettingsStore,
    },
  ),
);

// One constant object, so the selector result stays stable between renders.
const NO_SELECTION: ThrottleSelection = {kind: 'none'};

export const useThrottleSelection = (index: ThrottleIndex): ThrottleSelection =>
  useSettingsStore((state) => state.throttles[index] ?? NO_SELECTION);

// Puts a library loco on a throttle and remembers it as recently driven.
export const chooseLocoToDrive = (
  index: ThrottleIndex,
  locoId: number,
): void => {
  const settings = useSettingsStore.getState();
  settings.update({
    throttles: withSelection(settings.throttles, index, {
      kind: 'library',
      locoId,
    }),
    recentLocoIds: withRecent(settings.recentLocoIds, locoId),
  });
};

// Puts a plain address (not in the library) on a throttle.
export const chooseAddressToDrive = (
  index: ThrottleIndex,
  address: number,
  speedSteps: SpeedSteps,
): void => {
  const settings = useSettingsStore.getState();
  settings.update({
    throttles: withSelection(settings.throttles, index, {
      kind: 'address',
      address,
      speedSteps,
    }),
  });
};

// Forgets a deleted loco everywhere in the settings.
export const forgetLoco = (locoId: number): void => {
  const settings = useSettingsStore.getState();
  settings.update({
    throttles: withoutLoco(settings.throttles, locoId),
    recentLocoIds: settings.recentLocoIds.filter((id) => id !== locoId),
  });
};
