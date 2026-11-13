import type {SQLiteStorage} from 'expo-sqlite/kv-store';
import {create} from 'zustand';
import {createJSONStorage, persist, StateStorage} from 'zustand/middleware';
import {DEFAULT_STOP_MODE, StopMode} from '../driving/globalStop';
import {withoutRecent, withRecent} from '../library/recent';
import {VehicleRef} from '../library/types';
import {SpeedSteps, Z21_DEFAULT_PORT} from '../protocol';
import {LanguageSetting} from '../strings';
import {
  DEFAULT_THROTTLES,
  migrateSettings,
  ThrottleIndex,
  selectionFor,
  ThrottleSelection,
  withoutVehicle,
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
  // Locos and consists driven recently, latest first (quick-switch strip).
  recent: VehicleRef[];
  // What the strip below the throttle shows.
  vehicleBar: VehicleBarMode;
  // 'system' follows the phone; unsupported languages fall back to English.
  language: LanguageSetting;
};

// 'recent': recently driven, latest first. 'all': the whole vehicle list in
// its own order (Vehicles → Arrange), top of the list leftmost.
export type VehicleBarMode = 'recent' | 'all';
export const VEHICLE_BAR_MODES: VehicleBarMode[] = ['recent', 'all'];

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
      recent: [],
      vehicleBar: 'recent',
      language: 'system',
      update: (changes) => {
        set(changes);
      },
    }),
    {
      name: 'settings',
      version: 3,
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

// Puts a library loco or consist on a throttle and remembers it as
// recently driven.
export const chooseVehicleToDrive = (
  index: ThrottleIndex,
  ref: VehicleRef,
): void => {
  const settings = useSettingsStore.getState();
  settings.update({
    throttles: withSelection(settings.throttles, index, selectionFor(ref)),
    recent: withRecent(settings.recent, ref),
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

// Forgets a deleted loco or consist everywhere in the settings.
export const forgetVehicle = (ref: VehicleRef): void => {
  const settings = useSettingsStore.getState();
  settings.update({
    throttles: withoutVehicle(settings.throttles, ref),
    recent: withoutRecent(settings.recent, ref),
  });
};
