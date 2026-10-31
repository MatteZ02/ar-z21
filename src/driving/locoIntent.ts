import {LocoInfo, SpeedSteps} from '../protocol';

// After the user changes something, their value is shown for this long even
// if the central unit reports something else. That covers replies to older
// commands that are still on their way. After that, the central unit's
// report is the truth again.
export const LOCAL_CHANGE_HOLD_MS = 1500;

// What the user has set on this device but the central unit has not yet
// confirmed. Fields are undefined when nothing is pending for them.
export type LocoIntent = {
  speed?: number;
  // Set together with speed: true for an emergency stop, false otherwise.
  emergencyStop?: boolean;
  forward?: boolean;
  functions: Partial<Record<number, boolean>>;
  changedAt: number;
};

export type LocoChange =
  | {kind: 'speed'; speed: number}
  | {kind: 'emergencyStop'}
  | {kind: 'direction'; forward: boolean}
  | {kind: 'function'; index: number; on: boolean};

export const emptyIntent = (): LocoIntent => ({functions: {}, changedAt: 0});

export const isIntentEmpty = (intent: LocoIntent): boolean =>
  intent.speed === undefined &&
  intent.forward === undefined &&
  Object.keys(intent.functions).length === 0;

export const applyChange = (
  intent: LocoIntent,
  change: LocoChange,
  now: number,
): LocoIntent => {
  switch (change.kind) {
    case 'speed':
      return {
        ...intent,
        speed: change.speed,
        emergencyStop: false,
        changedAt: now,
      };
    case 'emergencyStop':
      return {...intent, speed: 0, emergencyStop: true, changedAt: now};
    case 'direction':
      return {...intent, forward: change.forward, changedAt: now};
    case 'function':
      return {
        ...intent,
        functions: {...intent.functions, [change.index]: change.on},
        changedAt: now,
      };
  }
};

// Called for every LAN_X_LOCO_INFO. Drops the parts the report confirms. Once
// the user has left the loco alone for LOCAL_CHANGE_HOLD_MS, drops everything:
// the report wins, even if it differs (another device, or a command that was
// lost).
export const reconcileIntent = (
  intent: LocoIntent,
  report: LocoInfo,
  now: number,
): LocoIntent => {
  if (now - intent.changedAt >= LOCAL_CHANGE_HOLD_MS) {
    return emptyIntent();
  }
  const next: LocoIntent = {...intent, functions: {...intent.functions}};
  if (
    next.speed === report.speed &&
    next.emergencyStop === report.emergencyStop
  ) {
    next.speed = undefined;
    next.emergencyStop = undefined;
  }
  if (next.forward === report.forward) {
    next.forward = undefined;
  }
  for (const [key, on] of Object.entries(next.functions)) {
    if (report.functions[Number(key)] === on) {
      delete next.functions[Number(key)];
    }
  }
  return next;
};

export type DisplayedLoco = {
  // False until the first LAN_X_LOCO_INFO has arrived.
  known: boolean;
  speedSteps: SpeedSteps | undefined;
  speed: number;
  emergencyStop: boolean;
  forward: boolean;
  functions: boolean[];
};

// What the throttle shows: the report, overlaid with pending user changes.
export const displayedLoco = (
  report: LocoInfo | null,
  intent: LocoIntent,
): DisplayedLoco => {
  const functions = [...(report?.functions ?? [])];
  for (const [key, on] of Object.entries(intent.functions)) {
    functions[Number(key)] = on === true;
  }
  return {
    known: report !== null,
    speedSteps: report?.speedSteps,
    speed: intent.speed ?? report?.speed ?? 0,
    emergencyStop: intent.emergencyStop ?? report?.emergencyStop ?? false,
    forward: intent.forward ?? report?.forward ?? true,
    functions,
  };
};
