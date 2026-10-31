// Constants from the Z21 LAN protocol specification v1.13.
// Section references (§) point to that document; see
// docs/reference/z21-protocol-notes.md for an index.

export const Z21_DEFAULT_PORT = 21105;

// Maximum UDP payload that fits an Ethernet MTU (§1.3).
export const MAX_UDP_PAYLOAD = 1472;

// LAN headers (the 16-bit Header field of a dataset).
export const LanHeader = {
  GET_SERIAL_NUMBER: 0x10,
  GET_CODE: 0x18,
  GET_HWINFO: 0x1a,
  LOGOFF: 0x30,
  XBUS: 0x40,
  SET_BROADCASTFLAGS: 0x50,
  GET_BROADCASTFLAGS: 0x51,
  SYSTEMSTATE_DATACHANGED: 0x84,
  SYSTEMSTATE_GETDATA: 0x85,
} as const;

// Broadcast flags (§2.16). Only the flags this app may use are listed.
// 0x00010000 ("all locos") is deliberately absent: the spec forbids it for
// mobile hand controllers.
export const BroadcastFlag = {
  // Driving and switching: track power, short circuit, stop, programming mode,
  // and LAN_X_LOCO_INFO for subscribed locos.
  BASIC: 0x00000001,
  // LAN_SYSTEMSTATE_DATACHANGED on every change. Off by default.
  SYSTEM_STATE: 0x00000100,
} as const;

// CentralState bitmask (§2.12, §2.18).
export const CentralStateBit = {
  EMERGENCY_STOP: 0x01,
  TRACK_VOLTAGE_OFF: 0x02,
  SHORT_CIRCUIT: 0x04,
  PROGRAMMING_MODE: 0x20,
} as const;

// CentralStateEx bitmask (§2.18).
export const CentralStateExBit = {
  HIGH_TEMPERATURE: 0x01,
  POWER_LOST: 0x02,
  SHORT_CIRCUIT_EXTERNAL: 0x04,
  SHORT_CIRCUIT_INTERNAL: 0x08,
  RCN213: 0x20,
} as const;

// Hardware types reported by LAN_GET_HWINFO (§2.20). Only central units.
export const HardwareType = {
  Z21_OLD: 0x00000200,
  Z21_NEW: 0x00000201,
  SMARTRAIL: 0x00000202,
  Z21_SMALL: 0x00000203,
  Z21_START: 0x00000204,
  Z21_XL: 0x00000211,
} as const;

// LAN_GET_CODE reply (§2.21).
export const LockCode = {
  NO_LOCK: 0x00,
  START_LOCKED: 0x01,
  START_UNLOCKED: 0x02,
} as const;
