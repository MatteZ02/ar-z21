// Loco address encoding (§4.1): two bytes, big-endian. Addresses >= 128 are
// long addresses and must have the two highest bits of Adr_MSB set.

export const MIN_LOCO_ADDRESS = 1;
// Highest DCC long address.
export const MAX_LOCO_ADDRESS = 10239;
const LONG_ADDRESS_THRESHOLD = 128;

export const isValidLocoAddress = (address: number): boolean =>
  Number.isInteger(address) &&
  address >= MIN_LOCO_ADDRESS &&
  address <= MAX_LOCO_ADDRESS;

export const encodeLocoAddress = (address: number): [number, number] => {
  if (!isValidLocoAddress(address)) {
    throw new RangeError(`Invalid loco address: ${address}`);
  }
  if (address >= LONG_ADDRESS_THRESHOLD) {
    return [0xc0 | (address >> 8), address & 0xff];
  }
  return [0x00, address];
};

export const decodeLocoAddress = (msb: number, lsb: number): number =>
  ((msb & 0x3f) << 8) | lsb;
