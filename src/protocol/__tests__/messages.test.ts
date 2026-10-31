import {fromHex} from '../hex';
import {
  decodeDatagram,
  formatBcdVersion,
  versionToNumber,
  Z21Message,
} from '../messages';

const decodeOne = (hex: string): Z21Message => {
  const messages = decodeDatagram(fromHex(hex));
  expect(messages).toHaveLength(1);
  return messages[0];
};

describe('track status broadcasts (pp. 13-15)', () => {
  it.each([
    ['07 00 40 00 61 00 61', 'trackPowerOff'],
    ['07 00 40 00 61 01 60', 'trackPowerOn'],
    ['07 00 40 00 61 02 63', 'programmingMode'],
    ['07 00 40 00 61 08 69', 'shortCircuit'],
    ['07 00 40 00 81 00 81', 'stopped'],
    ['07 00 40 00 61 82 E3', 'unknownCommand'],
  ])('%s is %s', (hex, type) => {
    expect(decodeOne(hex)).toEqual({type});
  });
});

describe('LAN_X_STATUS_CHANGED (p. 14)', () => {
  it('decodes the central state bitmask', () => {
    expect(decodeOne('08 00 40 00 62 22 06 46')).toEqual({
      type: 'status',
      centralState: {
        raw: 0x06,
        emergencyStop: false,
        trackVoltageOff: true,
        shortCircuit: true,
        programmingMode: false,
      },
    });
  });
});

describe('version and device info', () => {
  it('decodes LAN_GET_HWINFO using the spec example (p. 19)', () => {
    expect(decodeOne('0C 00 1A 00 00 02 00 00 20 01 00 00')).toEqual({
      type: 'hwInfo',
      hardwareType: 0x200,
      firmwareVersion: '1.20',
    });
  });

  it('decodes LAN_X_GET_FIRMWARE_VERSION using the spec example (p. 15)', () => {
    expect(decodeOne('09 00 40 00 F3 0A 01 23 DB')).toEqual({
      type: 'firmwareVersion',
      firmwareVersion: '1.23',
    });
  });

  it('decodes LAN_X_GET_VERSION reply (p. 11)', () => {
    // X-Bus V3.0, command station ID 0x12 (Z21 family)
    expect(decodeOne('09 00 40 00 63 21 30 12 60')).toEqual({
      type: 'xbusVersion',
      xbusVersion: 0x30,
      commandStationId: 0x12,
    });
  });

  it('decodes LAN_GET_SERIAL_NUMBER reply (p. 11)', () => {
    expect(decodeOne('08 00 10 00 39 30 00 00')).toEqual({
      type: 'serialNumber',
      serialNumber: 12345,
    });
  });

  it('decodes LAN_GET_CODE reply (p. 20)', () => {
    expect(decodeOne('05 00 18 00 01')).toEqual({type: 'code', code: 1});
  });

  it('decodes LAN_GET_BROADCASTFLAGS reply (p. 17)', () => {
    expect(decodeOne('08 00 51 00 01 01 00 00')).toEqual({
      type: 'broadcastFlags',
      flags: 0x101,
    });
  });

  it('formats and compares BCD versions', () => {
    expect(formatBcdVersion(0x01, 0x43)).toBe('1.43');
    expect(formatBcdVersion(0x01, 0x05)).toBe('1.05');
    expect(versionToNumber('1.43')).toBe(143);
    expect(versionToNumber('1.43') > versionToNumber('1.42')).toBe(true);
    expect(versionToNumber('garbage')).toBeNaN();
  });
});

describe('LAN_SYSTEMSTATE_DATACHANGED (p. 18)', () => {
  it('decodes all fields', () => {
    const message = decodeOne(
      '14 00 84 00' +
        ' E8 03' + // MainCurrent 1000 mA
        ' 00 00' + // ProgCurrent 0
        ' 84 03' + // FilteredMainCurrent 900
        ' 23 00' + // Temperature 35 °C
        ' 48 4B' + // SupplyVoltage 19272 mV
        ' 10 3B' + // VCCVoltage 15120 mV
        ' 01' + // CentralState: emergency stop
        ' 08' + // CentralStateEx: internal short circuit
        ' 00' + // reserved
        ' 31', // Capabilities: DCC | loco cmds | accessory cmds
    );
    expect(message).toEqual({
      type: 'systemState',
      systemState: {
        mainCurrent: 1000,
        progCurrent: 0,
        filteredMainCurrent: 900,
        temperature: 35,
        supplyVoltage: 19272,
        vccVoltage: 15120,
        centralState: {
          raw: 0x01,
          emergencyStop: true,
          trackVoltageOff: false,
          shortCircuit: false,
          programmingMode: false,
        },
        centralStateEx: 0x08,
        capabilities: 0x31,
      },
    });
  });

  it('decodes negative currents as signed', () => {
    const message = decodeOne(
      '14 00 84 00 FF FF 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
    );
    expect(
      message.type === 'systemState' && message.systemState.mainCurrent,
    ).toBe(-1);
  });
});

describe('LAN_X_LOCO_INFO (p. 28)', () => {
  it('decodes a minimal 8-byte loco info', () => {
    // addr 3, 128 steps, forward step 64, F0 + F2 on, F5 on, F13 on, F28 on
    const message = decodeOne('0E 00 40 00 EF 00 03 04 C1 12 01 01 80 BB');
    expect(message.type).toBe('locoInfo');
    if (message.type !== 'locoInfo') {
      return;
    }
    const {loco} = message;
    expect(loco).toMatchObject({
      address: 3,
      busy: false,
      speedSteps: 128,
      forward: true,
      speed: 64,
      emergencyStop: false,
      doubleTraction: false,
      smartSearch: false,
    });
    expect(loco.functions).toHaveLength(29);
    const on = loco.functions.flatMap((value, index) => (value ? [index] : []));
    expect(on).toEqual([0, 2, 5, 13, 28]);
  });

  it('decodes F29-F31 when DB8 is present (FW 1.42+)', () => {
    // addr 1234, 28 steps, busy, reverse step 10, DB8 = F29 + F31
    const message = decodeOne('0F 00 40 00 EF C4 D2 0A 16 00 00 00 00 05 E0');
    expect(message.type).toBe('locoInfo');
    if (message.type !== 'locoInfo') {
      return;
    }
    const {loco} = message;
    expect(loco).toMatchObject({
      address: 1234,
      busy: true,
      speedSteps: 28,
      forward: false,
      speed: 10,
    });
    expect(loco.functions).toHaveLength(32);
    expect(loco.functions[29]).toBe(true);
    expect(loco.functions[30]).toBe(false);
    expect(loco.functions[31]).toBe(true);
  });

  it('ignores optional bytes beyond DB8', () => {
    const message = decodeOne(
      '11 00 40 00 EF 00 03 04 00 00 00 00 00 00 AA BB F9',
    );
    expect(message.type).toBe('locoInfo');
  });

  it('decodes double traction and smartsearch bits', () => {
    const message = decodeOne('0E 00 40 00 EF 00 03 04 00 60 00 00 00 88');
    expect(message).toMatchObject({
      loco: {doubleTraction: true, smartSearch: true},
    });
  });

  it('rejects a loco info that is too short', () => {
    expect(decodeOne('0B 00 40 00 EF 00 03 04 00 60 88')).toMatchObject({
      type: 'invalid',
    });
  });
});

describe('robustness', () => {
  it('rejects a wrong checksum', () => {
    expect(decodeOne('07 00 40 00 61 01 61')).toMatchObject({
      type: 'invalid',
      reason: 'X-Bus checksum mismatch',
    });
  });

  it('passes unknown datasets through', () => {
    expect(decodeOne('06 00 80 00 00 01')).toMatchObject({
      type: 'unknown',
      header: 0x80,
    });
  });

  it('decodes every dataset in a combined datagram and flags trailing bytes', () => {
    const messages = decodeDatagram(
      fromHex('07 00 40 00 61 01 60 07 00 40 00 81 00 81 05 00'),
    );
    expect(messages.map((m) => m.type)).toEqual([
      'trackPowerOn',
      'stopped',
      'invalid',
    ]);
  });
});
