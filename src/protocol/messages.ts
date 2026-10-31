// Decoders for Z21-to-client messages.
import {decodeLocoAddress} from './address';
import {CentralStateBit, LanHeader} from './constants';
import {Dataset, splitDatagram, xorChecksum} from './dataset';
import {decodeSpeedByte, SpeedSteps, speedStepsFromLocoInfo} from './speed';

export type CentralState = {
  raw: number;
  emergencyStop: boolean;
  trackVoltageOff: boolean;
  shortCircuit: boolean;
  programmingMode: boolean;
};

export type SystemState = {
  mainCurrent: number;
  progCurrent: number;
  filteredMainCurrent: number;
  temperature: number;
  supplyVoltage: number;
  vccVoltage: number;
  centralState: CentralState;
  centralStateEx: number;
  // 0 on firmware older than 1.42; do not evaluate it then.
  capabilities: number;
};

export type LocoInfo = {
  address: number;
  // Controlled by another X-BUS handset (e.g. multiMaus). Not set for other
  // LAN clients.
  busy: boolean;
  // undefined if the central unit reported an unknown speed-step code.
  speedSteps: SpeedSteps | undefined;
  forward: boolean;
  speed: number;
  emergencyStop: boolean;
  doubleTraction: boolean;
  smartSearch: boolean;
  // Index = function number. F0..F28, plus F29..F31 when the central unit
  // sends them (FW 1.42+).
  functions: boolean[];
};

export type Z21Message =
  | {type: 'serialNumber'; serialNumber: number}
  | {type: 'code'; code: number}
  | {type: 'hwInfo'; hardwareType: number; firmwareVersion: string}
  | {type: 'broadcastFlags'; flags: number}
  | {type: 'systemState'; systemState: SystemState}
  | {type: 'trackPowerOff'}
  | {type: 'trackPowerOn'}
  | {type: 'programmingMode'}
  | {type: 'shortCircuit'}
  | {type: 'stopped'}
  | {type: 'unknownCommand'}
  | {type: 'status'; centralState: CentralState}
  | {type: 'xbusVersion'; xbusVersion: number; commandStationId: number}
  | {type: 'firmwareVersion'; firmwareVersion: string}
  | {type: 'locoInfo'; loco: LocoInfo}
  // Valid dataset that this app does not handle.
  | {type: 'unknown'; header: number; data: Uint8Array}
  // Dataset that is too short or has a wrong checksum.
  | {type: 'invalid'; header: number; data: Uint8Array; reason: string};

const LOCO_INFO_MIN_DATA_BYTES = 8; // DB0..DB7
const SYSTEM_STATE_LENGTH = 16;

export const decodeCentralState = (raw: number): CentralState => ({
  raw,
  emergencyStop: (raw & CentralStateBit.EMERGENCY_STOP) !== 0,
  trackVoltageOff: (raw & CentralStateBit.TRACK_VOLTAGE_OFF) !== 0,
  shortCircuit: (raw & CentralStateBit.SHORT_CIRCUIT) !== 0,
  programmingMode: (raw & CentralStateBit.PROGRAMMING_MODE) !== 0,
});

// Formats a BCD version (major byte, minor byte) as "1.43".
export const formatBcdVersion = (major: number, minor: number): string =>
  `${major.toString(16)}.${minor.toString(16).padStart(2, '0')}`;

// Parses "1.43" into 143, for comparisons. NaN if not a version string.
export const versionToNumber = (version: string): number => {
  const match = /^(\d+)\.(\d{2})$/.exec(version);
  return match ? Number(match[1]) * 100 + Number(match[2]) : NaN;
};

const readUint32LE = (data: Uint8Array, offset: number): number =>
  (data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)) >>>
  0;

const invalid = (dataset: Dataset, reason: string): Z21Message => ({
  type: 'invalid',
  header: dataset.header,
  data: dataset.data,
  reason,
});

const unknown = (dataset: Dataset): Z21Message => ({
  type: 'unknown',
  header: dataset.header,
  data: dataset.data,
});

const decodeLocoInfo = (db: Uint8Array): LocoInfo => {
  const functions: boolean[] = [
    // F0 is bit 4 of DB4, F1..F4 are bits 0..3.
    (db[4] & 0x10) !== 0,
    (db[4] & 0x01) !== 0,
    (db[4] & 0x02) !== 0,
    (db[4] & 0x04) !== 0,
    (db[4] & 0x08) !== 0,
  ];
  // DB5..DB7: F5..F28, eight per byte, LSB first. DB8: F29..F31 (FW 1.42+).
  const lastGroupByte = db.length > 8 ? 8 : 7;
  for (let byte = 5; byte <= lastGroupByte; byte++) {
    const count = byte === 8 ? 3 : 8;
    for (let bit = 0; bit < count; bit++) {
      functions.push((db[byte] & (1 << bit)) !== 0);
    }
  }

  const speedSteps = speedStepsFromLocoInfo(db[2]);
  // An unknown step code is decoded as 128 steps, the most common mode.
  const speed = decodeSpeedByte(speedSteps ?? 128, db[3]);

  return {
    address: decodeLocoAddress(db[0], db[1]),
    busy: (db[2] & 0x08) !== 0,
    speedSteps,
    ...speed,
    doubleTraction: (db[4] & 0x40) !== 0,
    smartSearch: (db[4] & 0x20) !== 0,
    functions,
  };
};

const decodeXBus = (dataset: Dataset): Z21Message => {
  const {data} = dataset;
  if (data.length < 2) {
    return invalid(dataset, 'X-Bus message too short');
  }
  const body = data.subarray(0, data.length - 1);
  if (xorChecksum(body) !== data[data.length - 1]) {
    return invalid(dataset, 'X-Bus checksum mismatch');
  }

  const xHeader = body[0];
  const db = body.subarray(1);

  switch (xHeader) {
    case 0x61:
      switch (db[0]) {
        case 0x00:
          return {type: 'trackPowerOff'};
        case 0x01:
          return {type: 'trackPowerOn'};
        case 0x02:
          return {type: 'programmingMode'};
        case 0x08:
          return {type: 'shortCircuit'};
        case 0x82:
          return {type: 'unknownCommand'};
      }
      break;
    case 0x62:
      if (db[0] === 0x22 && db.length >= 2) {
        return {type: 'status', centralState: decodeCentralState(db[1])};
      }
      break;
    case 0x63:
      if (db[0] === 0x21 && db.length >= 3) {
        return {
          type: 'xbusVersion',
          xbusVersion: db[1],
          commandStationId: db[2],
        };
      }
      break;
    case 0x81:
      if (db[0] === 0x00) {
        return {type: 'stopped'};
      }
      break;
    case 0xef:
      if (db.length < LOCO_INFO_MIN_DATA_BYTES) {
        return invalid(dataset, 'LAN_X_LOCO_INFO too short');
      }
      return {type: 'locoInfo', loco: decodeLocoInfo(db)};
    case 0xf3:
      if (db[0] === 0x0a && db.length >= 3) {
        return {
          type: 'firmwareVersion',
          firmwareVersion: formatBcdVersion(db[1], db[2]),
        };
      }
      break;
  }
  return unknown(dataset);
};

const decodeSystemState = (data: Uint8Array): SystemState => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    mainCurrent: view.getInt16(0, true),
    progCurrent: view.getInt16(2, true),
    filteredMainCurrent: view.getInt16(4, true),
    temperature: view.getInt16(6, true),
    supplyVoltage: view.getUint16(8, true),
    vccVoltage: view.getUint16(10, true),
    centralState: decodeCentralState(data[12]),
    centralStateEx: data[13],
    capabilities: data[15],
  };
};

export const decodeDataset = (dataset: Dataset): Z21Message => {
  const {header, data} = dataset;

  switch (header) {
    case LanHeader.XBUS:
      return decodeXBus(dataset);
    case LanHeader.GET_SERIAL_NUMBER:
      return data.length >= 4
        ? {type: 'serialNumber', serialNumber: readUint32LE(data, 0)}
        : invalid(dataset, 'Serial number too short');
    case LanHeader.GET_CODE:
      return data.length >= 1
        ? {type: 'code', code: data[0]}
        : invalid(dataset, 'Code reply too short');
    case LanHeader.GET_HWINFO:
      return data.length >= 8
        ? {
            type: 'hwInfo',
            hardwareType: readUint32LE(data, 0),
            // FW version is BCD in the low two bytes: 0x00000143 = "1.43".
            firmwareVersion: formatBcdVersion(data[5], data[4]),
          }
        : invalid(dataset, 'HW info too short');
    case LanHeader.GET_BROADCASTFLAGS:
      return data.length >= 4
        ? {type: 'broadcastFlags', flags: readUint32LE(data, 0)}
        : invalid(dataset, 'Broadcast flags too short');
    case LanHeader.SYSTEMSTATE_DATACHANGED:
      return data.length >= SYSTEM_STATE_LENGTH
        ? {type: 'systemState', systemState: decodeSystemState(data)}
        : invalid(dataset, 'System state too short');
  }
  return unknown(dataset);
};

// Splits a received UDP payload and decodes every dataset in it.
export const decodeDatagram = (payload: Uint8Array): Z21Message[] => {
  const {datasets, trailingBytes} = splitDatagram(payload);
  const messages = datasets.map(decodeDataset);
  if (trailingBytes > 0) {
    messages.push({
      type: 'invalid',
      header: -1,
      data: payload.subarray(payload.length - trailingBytes),
      reason: 'Incomplete dataset at end of datagram',
    });
  }
  return messages;
};
