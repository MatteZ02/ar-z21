import {sameVehicle, VehicleRef} from './types';

// Recently driven locos and consists for the quick-switch strip (brief §6.5).
export const MAX_RECENT = 10;

// Moves the entry to the front, without duplicates, keeping at most the limit.
export const withRecent = (
  recent: VehicleRef[],
  ref: VehicleRef,
  limit = MAX_RECENT,
): VehicleRef[] =>
  [ref, ...recent.filter((entry) => !sameVehicle(entry, ref))].slice(0, limit);

export const withoutRecent = (
  recent: VehicleRef[],
  ref: VehicleRef,
): VehicleRef[] => recent.filter((entry) => !sameVehicle(entry, ref));
