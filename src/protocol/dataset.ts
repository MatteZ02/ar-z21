import {LanHeader, MAX_UDP_PAYLOAD} from './constants';

// A Z21 dataset: DataLen (u16 LE) + Header (u16 LE) + Data (§1.2.1).
export type Dataset = {
  header: number;
  data: Uint8Array;
};

export const encodeDataset = (
  header: number,
  data: ArrayLike<number> = [],
): Uint8Array => {
  const length = 4 + data.length;
  const bytes = new Uint8Array(length);
  bytes[0] = length & 0xff;
  bytes[1] = (length >> 8) & 0xff;
  bytes[2] = header & 0xff;
  bytes[3] = (header >> 8) & 0xff;
  bytes.set(data, 4);
  return bytes;
};

export const xorChecksum = (bytes: ArrayLike<number>): number => {
  let checksum = 0;
  for (let i = 0; i < bytes.length; i++) {
    checksum ^= bytes[i];
  }
  return checksum;
};

// Wraps an X-Bus message (X-Header + DB0..DBn) in a LAN_X dataset and appends
// the XOR checksum (§1.2.2).
export const encodeXBus = (xbusBytes: number[]): Uint8Array =>
  encodeDataset(LanHeader.XBUS, [...xbusBytes, xorChecksum(xbusBytes)]);

export type SplitResult = {
  datasets: Dataset[];
  // Bytes at the end that did not form a complete, valid dataset.
  trailingBytes: number;
};

// Splits one UDP payload into all the datasets it contains (§1.3). Stops at
// the first malformed length, because nothing after it can be trusted.
export const splitDatagram = (payload: Uint8Array): SplitResult => {
  const datasets: Dataset[] = [];
  let offset = 0;

  while (payload.length - offset >= 4) {
    const length = payload[offset] | (payload[offset + 1] << 8);
    if (length < 4 || offset + length > payload.length) {
      break;
    }
    datasets.push({
      header: payload[offset + 2] | (payload[offset + 3] << 8),
      data: payload.subarray(offset + 4, offset + length),
    });
    offset += length;
  }

  return {datasets, trailingBytes: payload.length - offset};
};

// Packs encoded datasets into as few UDP payloads as possible, each at most
// maxPayload bytes (§1.3).
export const packDatagrams = (
  datasets: Uint8Array[],
  maxPayload: number = MAX_UDP_PAYLOAD,
): Uint8Array[] => {
  const datagrams: Uint8Array[] = [];
  let current: Uint8Array[] = [];
  let currentLength = 0;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const datagram = new Uint8Array(currentLength);
    let offset = 0;
    for (const dataset of current) {
      datagram.set(dataset, offset);
      offset += dataset.length;
    }
    datagrams.push(datagram);
    current = [];
    currentLength = 0;
  };

  for (const dataset of datasets) {
    if (currentLength + dataset.length > maxPayload) {
      flush();
    }
    current.push(dataset);
    currentLength += dataset.length;
  }
  flush();

  return datagrams;
};
