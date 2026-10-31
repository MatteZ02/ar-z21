import {
  lanGetBroadcastFlags,
  lanGetCode,
  lanGetHwInfo,
  lanGetSerialNumber,
  lanLogoff,
  lanSetBroadcastFlags,
  lanSystemStateGetData,
  lanXGetFirmwareVersion,
  lanXGetLocoInfo,
  lanXGetStatus,
  lanXGetVersion,
  lanXSetLocoDrive,
  lanXSetLocoEStop,
  lanXSetLocoFunction,
  lanXSetStop,
  lanXSetTrackPowerOff,
  lanXSetTrackPowerOn,
} from '../commands';
import {BroadcastFlag} from '../constants';
import {toHex} from '../hex';

// Expected bytes are taken from the Z21 LAN protocol spec v1.13 (page noted)
// or computed from its rules (worked examples in z21-protocol-notes.md).
describe('LAN commands without X-Bus', () => {
  it.each([
    ['LAN_GET_SERIAL_NUMBER (p. 11)', lanGetSerialNumber, '04 00 10 00'],
    ['LAN_LOGOFF (p. 11)', lanLogoff, '04 00 30 00'],
    ['LAN_GET_BROADCASTFLAGS (p. 17)', lanGetBroadcastFlags, '04 00 51 00'],
    ['LAN_SYSTEMSTATE_GETDATA (p. 19)', lanSystemStateGetData, '04 00 85 00'],
    ['LAN_GET_HWINFO (p. 19)', lanGetHwInfo, '04 00 1A 00'],
    ['LAN_GET_CODE (p. 20)', lanGetCode, '04 00 18 00'],
  ])('%s', (_name, encode, expected) => {
    expect(toHex(encode())).toBe(expected);
  });

  it('LAN_SET_BROADCASTFLAGS encodes flags little-endian (p. 16)', () => {
    expect(toHex(lanSetBroadcastFlags(BroadcastFlag.BASIC))).toBe(
      '08 00 50 00 01 00 00 00',
    );
    expect(
      toHex(
        lanSetBroadcastFlags(BroadcastFlag.BASIC | BroadcastFlag.SYSTEM_STATE),
      ),
    ).toBe('08 00 50 00 01 01 00 00');
    expect(toHex(lanSetBroadcastFlags(0x08000000))).toBe(
      '08 00 50 00 00 00 00 08',
    );
  });
});

describe('LAN_X commands', () => {
  it.each([
    ['LAN_X_GET_VERSION (p. 11)', lanXGetVersion, '07 00 40 00 21 21 00'],
    ['LAN_X_GET_STATUS (p. 12)', lanXGetStatus, '07 00 40 00 21 24 05'],
    [
      'LAN_X_SET_TRACK_POWER_OFF (p. 12)',
      lanXSetTrackPowerOff,
      '07 00 40 00 21 80 A1',
    ],
    [
      'LAN_X_SET_TRACK_POWER_ON (p. 12)',
      lanXSetTrackPowerOn,
      '07 00 40 00 21 81 A0',
    ],
    ['LAN_X_SET_STOP (p. 15)', lanXSetStop, '06 00 40 00 80 80'],
    [
      'LAN_X_GET_FIRMWARE_VERSION (p. 15)',
      lanXGetFirmwareVersion,
      '07 00 40 00 F1 0A FB',
    ],
  ])('%s', (_name, encode, expected) => {
    expect(toHex(encode())).toBe(expected);
  });
});

describe('LAN_X_GET_LOCO_INFO (p. 23)', () => {
  it('encodes a short address', () => {
    expect(toHex(lanXGetLocoInfo(3))).toBe('09 00 40 00 E3 F0 00 03 10');
  });

  it('sets the 0xC0 flag for addresses >= 128', () => {
    expect(toHex(lanXGetLocoInfo(1234))).toBe('09 00 40 00 E3 F0 C4 D2 05');
    expect(toHex(lanXGetLocoInfo(128))).toBe('09 00 40 00 E3 F0 C0 80 53');
  });

  it('keeps address 127 short', () => {
    expect(toHex(lanXGetLocoInfo(127))).toBe('09 00 40 00 E3 F0 00 7F 6C');
  });
});

describe('LAN_X_SET_LOCO_DRIVE (p. 24)', () => {
  it('128 steps, forward, step 64', () => {
    const bytes = lanXSetLocoDrive({
      address: 3,
      steps: 128,
      forward: true,
      speed: 64,
      emergencyStop: false,
    });
    expect(toHex(bytes)).toBe('0A 00 40 00 E4 13 00 03 C1 35');
  });

  it('28 steps, reverse, step 10, long address', () => {
    const bytes = lanXSetLocoDrive({
      address: 1234,
      steps: 28,
      forward: false,
      speed: 10,
      emergencyStop: false,
    });
    expect(toHex(bytes)).toBe('0A 00 40 00 E4 12 C4 D2 16 F6');
  });

  it('14 steps, forward, step 5', () => {
    const bytes = lanXSetLocoDrive({
      address: 3,
      steps: 14,
      forward: true,
      speed: 5,
      emergencyStop: false,
    });
    expect(toHex(bytes)).toBe('0A 00 40 00 E4 10 00 03 86 71');
  });

  it('emergency stop keeps the direction bit', () => {
    const bytes = lanXSetLocoDrive({
      address: 3,
      steps: 128,
      forward: true,
      speed: 0,
      emergencyStop: true,
    });
    expect(toHex(bytes)).toBe('0A 00 40 00 E4 13 00 03 81 75');
  });
});

describe('LAN_X_SET_LOCO_FUNCTION (p. 25)', () => {
  it('F0 on', () => {
    expect(toHex(lanXSetLocoFunction(3, 0, 'on'))).toBe(
      '0A 00 40 00 E4 F8 00 03 40 5F',
    );
  });

  it('F12 toggle', () => {
    expect(toHex(lanXSetLocoFunction(3, 12, 'toggle'))).toBe(
      '0A 00 40 00 E4 F8 00 03 8C 93',
    );
  });

  it('F31 off', () => {
    expect(toHex(lanXSetLocoFunction(3, 31, 'off'))).toBe(
      '0A 00 40 00 E4 F8 00 03 1F 00',
    );
  });

  it('rejects function numbers above F31', () => {
    expect(() => lanXSetLocoFunction(3, 32, 'on')).toThrow(RangeError);
  });
});

describe('LAN_X_SET_LOCO_E_STOP (p. 29)', () => {
  it('encodes address 3', () => {
    expect(toHex(lanXSetLocoEStop(3))).toBe('08 00 40 00 92 00 03 91');
  });
});
