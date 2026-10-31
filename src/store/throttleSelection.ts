import {Consist, Loco, sameVehicle, VehicleRef} from '../library/types';
import {DEFAULT_SPEED_STEPS, SpeedSteps} from '../protocol';

// What one throttle drives: a library loco, a consist, a plain address that
// is not in the library, or nothing yet.
export type ThrottleSelection =
  | {kind: 'library'; locoId: number}
  | {kind: 'consist'; consistId: number}
  | {kind: 'address'; address: number; speedSteps: SpeedSteps}
  | {kind: 'none'};

// Throttle 0 is the phone throttle and the left one in split screen;
// throttle 1 is the right one (brief §6.6).
export const THROTTLE_COUNT = 2;
export type ThrottleIndex = 0 | 1;

export const DEFAULT_THROTTLES: ThrottleSelection[] = [
  {kind: 'address', address: 3, speedSteps: DEFAULT_SPEED_STEPS},
  // The second throttle starts empty, so nothing is subscribed or driven
  // until the user picks a loco.
  {kind: 'none'},
];

export const isThrottleIndex = (value: number): value is ThrottleIndex =>
  value === 0 || value === 1;

export const selectionFor = (ref: VehicleRef): ThrottleSelection =>
  ref.kind === 'loco'
    ? {kind: 'library', locoId: ref.id}
    : {kind: 'consist', consistId: ref.id};

// The library entry a throttle drives, if any.
export const selectionRef = (
  selection: ThrottleSelection,
): VehicleRef | null =>
  selection.kind === 'library'
    ? {kind: 'loco', id: selection.locoId}
    : selection.kind === 'consist'
      ? {kind: 'consist', id: selection.consistId}
      : null;

export const withSelection = (
  throttles: ThrottleSelection[],
  index: ThrottleIndex,
  selection: ThrottleSelection,
): ThrottleSelection[] =>
  throttles.map((current, i) => (i === index ? selection : current));

// Clears a deleted loco or consist from every throttle.
export const withoutVehicle = (
  throttles: ThrottleSelection[],
  ref: VehicleRef,
): ThrottleSelection[] =>
  throttles.map((selection) => {
    const current = selectionRef(selection);
    return current !== null && sameVehicle(current, ref)
      ? {kind: 'none'}
      : selection;
  });

// Older saved settings, brought up to the current version (3):
// - version 1 had one throttle: driveLocoId, or a plain address;
// - version 2 kept recently driven locos as recentLocoIds;
// - version 3 keeps recently driven locos and consists as `recent`.
export const migrateSettings = (
  persisted: unknown,
  version: number,
): Record<string, unknown> => {
  let state = (
    typeof persisted === 'object' && persisted !== null ? persisted : {}
  ) as Record<string, unknown>;
  if (version < 2) {
    const {driveLocoId, locoAddress, locoSpeedSteps, ...rest} = state;
    const first: ThrottleSelection =
      typeof driveLocoId === 'number'
        ? {kind: 'library', locoId: driveLocoId}
        : {
            kind: 'address',
            address: typeof locoAddress === 'number' ? locoAddress : 3,
            speedSteps:
              locoSpeedSteps === 14 || locoSpeedSteps === 28
                ? locoSpeedSteps
                : DEFAULT_SPEED_STEPS,
          };
    state = {...rest, throttles: [first, DEFAULT_THROTTLES[1]]};
  }
  if (version < 3) {
    const {recentLocoIds, ...rest} = state;
    const ids = Array.isArray(recentLocoIds)
      ? recentLocoIds.filter((id): id is number => typeof id === 'number')
      : [];
    state = {...rest, recent: ids.map((id) => ({kind: 'loco', id}))};
  }
  return state;
};

// The loco addresses a selection drives (several for a consist).
export const selectionAddresses = (
  selection: ThrottleSelection,
  locos: Loco[],
  consists: Consist[],
): number[] => {
  const addressOf = (locoId: number) =>
    locos.find((loco) => loco.id === locoId)?.address;
  switch (selection.kind) {
    case 'library': {
      const address = addressOf(selection.locoId);
      return address === undefined ? [] : [address];
    }
    case 'consist':
      return (
        consists
          .find((consist) => consist.id === selection.consistId)
          ?.members.map((member) => addressOf(member.locoId))
          .filter((address) => address !== undefined) ?? []
      );
    case 'address':
      return [selection.address];
    case 'none':
      return [];
  }
};

// Addresses that the new selection and another throttle would both drive,
// where a consist is involved. The same single loco on both throttles is
// fine (they stay in sync; decided by the user), but a consist member also
// driven on its own would be driven two ways (brief §6.7): warn first.
export const consistConflicts = (
  next: ThrottleSelection,
  other: ThrottleSelection,
  locos: Loco[],
  consists: Consist[],
): number[] => {
  if (next.kind !== 'consist' && other.kind !== 'consist') {
    return [];
  }
  if (
    next.kind === 'consist' &&
    other.kind === 'consist' &&
    next.consistId === other.consistId
  ) {
    return [];
  }
  const otherAddresses = new Set(selectionAddresses(other, locos, consists));
  return selectionAddresses(next, locos, consists).filter((address) =>
    otherAddresses.has(address),
  );
};
