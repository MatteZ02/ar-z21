// Speed step encoding for LAN_X_SET_LOCO_DRIVE and LAN_X_LOCO_INFO (§4.2,
// §4.4).
//
// Speeds are expressed as a step number: 0 = stop, 1..maxSpeedStep = moving.
// Emergency stop is a separate flag, not a step.

export type SpeedSteps = 14 | 28 | 128;

export const DEFAULT_SPEED_STEPS: SpeedSteps = 128;

const DIRECTION_FORWARD = 0x80;
const EMERGENCY_STOP_VALUE = 0x01;

// Highest usable step. 128-step mode has 126 moving steps.
export const maxSpeedStep = (steps: SpeedSteps): number =>
  steps === 128 ? 126 : steps;

// The 0x1S byte of LAN_X_SET_LOCO_DRIVE.
export const driveCodeForSpeedSteps = (steps: SpeedSteps): number => {
  switch (steps) {
    case 14:
      return 0x10;
    case 28:
      return 0x12;
    case 128:
      return 0x13;
  }
};

// The KKK bits of LAN_X_LOCO_INFO DB2. Note: different codes from the drive
// command (128 steps is 4 here, 3 there).
export const speedStepsFromLocoInfo = (kkk: number): SpeedSteps | undefined => {
  switch (kkk & 0x07) {
    case 0:
      return 14;
    case 2:
      return 28;
    case 4:
      return 128;
    default:
      return undefined;
  }
};

export type SpeedValue = {
  forward: boolean;
  // 0 = stop, 1..maxSpeedStep = moving. 0 when emergencyStop is set.
  speed: number;
  emergencyStop: boolean;
};

// Encodes the RVVVVVVV byte.
export const encodeSpeedByte = (
  steps: SpeedSteps,
  {forward, speed, emergencyStop}: SpeedValue,
): number => {
  const direction = forward ? DIRECTION_FORWARD : 0;
  if (emergencyStop) {
    return direction | EMERGENCY_STOP_VALUE;
  }
  if (!Number.isInteger(speed) || speed < 0 || speed > maxSpeedStep(steps)) {
    throw new RangeError(`Invalid speed ${speed} for ${steps} speed steps`);
  }
  if (speed === 0) {
    return direction;
  }
  if (steps === 28) {
    // 28 steps: the value n + 3 is split so that its lowest bit goes to bit 4
    // and the rest to bits 0-3. Step 1 = 0x02, step 2 = 0x12, step 28 = 0x1F.
    const value = speed + 3;
    return direction | (value >> 1) | ((value & 0x01) << 4);
  }
  // 14 and 128 steps: step n is sent as n + 1 (0 = stop, 1 = e-stop).
  return direction | (speed + 1);
};

// Decodes the RVVVVVVV byte.
export const decodeSpeedByte = (
  steps: SpeedSteps,
  byte: number,
): SpeedValue => {
  const forward = (byte & DIRECTION_FORWARD) !== 0;

  // Normalise to a value where 0/1 = stop, 2/3 = e-stop (28 steps only) and
  // otherwise value - offset = step.
  let value: number;
  let stopValues: number;
  if (steps === 28) {
    value = ((byte & 0x0f) << 1) | ((byte >> 4) & 0x01);
    // 0 = Stop, 1 = "Stop1", 2 = E-Stop, 3 = "E-Stop1" (§4.2 table)
    stopValues = 2;
  } else {
    value = steps === 14 ? byte & 0x0f : byte & 0x7f;
    stopValues = 1;
  }

  if (value < stopValues) {
    return {forward, speed: 0, emergencyStop: false};
  }
  if (value < stopValues * 2) {
    return {forward, speed: 0, emergencyStop: true};
  }
  return {forward, speed: value - stopValues * 2 + 1, emergencyStop: false};
};
