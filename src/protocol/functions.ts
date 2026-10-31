// Loco function encoding for LAN_X_SET_LOCO_FUNCTION (§4.3.1).

// F0..F28 on all firmware; F29..F31 from Z21 FW 1.42.
export const MAX_FUNCTION_INDEX = 31;

export type FunctionSwitch = 'off' | 'on' | 'toggle';

const SWITCH_BITS: Record<FunctionSwitch, number> = {
  off: 0x00,
  on: 0x40,
  toggle: 0x80,
};

export const isValidFunctionIndex = (index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index <= MAX_FUNCTION_INDEX;

// Encodes the TTNNNNNN byte.
export const encodeFunctionByte = (
  index: number,
  switchType: FunctionSwitch,
): number => {
  if (!isValidFunctionIndex(index)) {
    throw new RangeError(`Invalid function index: ${index}`);
  }
  return SWITCH_BITS[switchType] | index;
};
