import {DEFAULT_SPEED_STEPS, SpeedSteps} from '../protocol';

// What one throttle drives: a library loco, a plain address that is not in
// the library, or nothing yet.
export type ThrottleSelection =
  | {kind: 'library'; locoId: number}
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

export const withSelection = (
  throttles: ThrottleSelection[],
  index: ThrottleIndex,
  selection: ThrottleSelection,
): ThrottleSelection[] =>
  throttles.map((current, i) => (i === index ? selection : current));

// Clears a deleted loco from every throttle.
export const withoutLoco = (
  throttles: ThrottleSelection[],
  locoId: number,
): ThrottleSelection[] =>
  throttles.map((selection) =>
    selection.kind === 'library' && selection.locoId === locoId
      ? {kind: 'none'}
      : selection,
  );

// Settings saved by version 1 had one throttle: driveLocoId, or a plain
// address. Version 2 has a selection per throttle.
export const migrateSettings = (
  persisted: unknown,
  version: number,
): Record<string, unknown> => {
  const state = (
    typeof persisted === 'object' && persisted !== null ? persisted : {}
  ) as Record<string, unknown>;
  if (version >= 2) {
    return state;
  }
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
  return {...rest, throttles: [first, DEFAULT_THROTTLES[1]]};
};
