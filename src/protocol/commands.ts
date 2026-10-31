// Encoders for client-to-Z21 messages. Each returns one encoded dataset.
// Byte layouts: docs/reference/z21-protocol-notes.md and the spec sections
// noted below.
import {encodeLocoAddress} from './address';
import {LanHeader} from './constants';
import {encodeDataset, encodeXBus} from './dataset';
import {encodeFunctionByte, FunctionSwitch} from './functions';
import {
  driveCodeForSpeedSteps,
  encodeSpeedByte,
  SpeedSteps,
  SpeedValue,
} from './speed';

// §2.1
export const lanGetSerialNumber = (): Uint8Array =>
  encodeDataset(LanHeader.GET_SERIAL_NUMBER);

// §2.21
export const lanGetCode = (): Uint8Array => encodeDataset(LanHeader.GET_CODE);

// §2.20
export const lanGetHwInfo = (): Uint8Array =>
  encodeDataset(LanHeader.GET_HWINFO);

// §2.2
export const lanLogoff = (): Uint8Array => encodeDataset(LanHeader.LOGOFF);

// §2.16
export const lanSetBroadcastFlags = (flags: number): Uint8Array => {
  const value = flags >>> 0;
  return encodeDataset(LanHeader.SET_BROADCASTFLAGS, [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
};

// §2.17
export const lanGetBroadcastFlags = (): Uint8Array =>
  encodeDataset(LanHeader.GET_BROADCASTFLAGS);

// §2.19
export const lanSystemStateGetData = (): Uint8Array =>
  encodeDataset(LanHeader.SYSTEMSTATE_GETDATA);

// §2.3
export const lanXGetVersion = (): Uint8Array => encodeXBus([0x21, 0x21]);

// §2.4
export const lanXGetStatus = (): Uint8Array => encodeXBus([0x21, 0x24]);

// §2.5
export const lanXSetTrackPowerOff = (): Uint8Array => encodeXBus([0x21, 0x80]);

// §2.6. Also ends emergency stop and programming mode.
export const lanXSetTrackPowerOn = (): Uint8Array => encodeXBus([0x21, 0x81]);

// §2.13. Emergency stop: all locos stop, track power stays on.
export const lanXSetStop = (): Uint8Array => encodeXBus([0x80]);

// §2.15
export const lanXGetFirmwareVersion = (): Uint8Array =>
  encodeXBus([0xf1, 0x0a]);

// §4.1. Also subscribes to LAN_X_LOCO_INFO for this address (max 16, FIFO).
export const lanXGetLocoInfo = (address: number): Uint8Array =>
  encodeXBus([0xe3, 0xf0, ...encodeLocoAddress(address)]);

export type DriveCommand = SpeedValue & {
  address: number;
  steps: SpeedSteps;
};

// §4.2
export const lanXSetLocoDrive = ({
  address,
  steps,
  ...speed
}: DriveCommand): Uint8Array =>
  encodeXBus([
    0xe4,
    driveCodeForSpeedSteps(steps),
    ...encodeLocoAddress(address),
    encodeSpeedByte(steps, speed),
  ]);

// §4.3.1
export const lanXSetLocoFunction = (
  address: number,
  index: number,
  switchType: FunctionSwitch,
): Uint8Array =>
  encodeXBus([
    0xe4,
    0xf8,
    ...encodeLocoAddress(address),
    encodeFunctionByte(index, switchType),
  ]);

// §4.5. Requires Z21 FW 1.43 or newer.
export const lanXSetLocoEStop = (address: number): Uint8Array =>
  encodeXBus([0x92, ...encodeLocoAddress(address)]);
