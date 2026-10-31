import {
  encodeDataset,
  encodeXBus,
  packDatagrams,
  splitDatagram,
  xorChecksum,
} from '../dataset';
import {fromHex, toHex} from '../hex';

describe('encodeDataset (p. 8)', () => {
  it('writes DataLen and Header little-endian', () => {
    expect(toHex(encodeDataset(0x50, [1, 0, 0, 0]))).toBe(
      '08 00 50 00 01 00 00 00',
    );
  });

  it('encodes a dataset without data', () => {
    expect(toHex(encodeDataset(0x30))).toBe('04 00 30 00');
  });
});

describe('X-Bus checksum (p. 9)', () => {
  it('XORs X-Header and all data bytes', () => {
    expect(xorChecksum([0x21, 0x80])).toBe(0xa1);
    expect(toHex(encodeXBus([0xf1, 0x0a]))).toBe('07 00 40 00 F1 0A FB');
  });
});

describe('splitDatagram (p. 10)', () => {
  it('returns every dataset in a combined datagram', () => {
    const payload = fromHex(
      '07 00 40 00 61 01 60' + // BC_TRACK_POWER_ON
        '08 00 40 00 62 22 00 40' + // STATUS_CHANGED
        '05 00 18 00 02', // LAN_GET_CODE reply
    );
    const {datasets, trailingBytes} = splitDatagram(payload);

    expect(trailingBytes).toBe(0);
    expect(datasets.map((d) => d.header)).toEqual([0x40, 0x40, 0x18]);
    expect(toHex(datasets[0].data)).toBe('61 01 60');
    expect(toHex(datasets[1].data)).toBe('62 22 00 40');
    expect(toHex(datasets[2].data)).toBe('02');
  });

  it('reports a truncated dataset at the end', () => {
    const {datasets, trailingBytes} = splitDatagram(
      fromHex('07 00 40 00 61 01 60 08 00 40'),
    );
    expect(datasets).toHaveLength(1);
    expect(trailingBytes).toBe(3);
  });

  it('stops at an impossible length instead of looping', () => {
    const {datasets, trailingBytes} = splitDatagram(fromHex('02 00 40 00 00'));
    expect(datasets).toHaveLength(0);
    expect(trailingBytes).toBe(5);
  });

  it('handles an empty payload', () => {
    expect(splitDatagram(new Uint8Array(0))).toEqual({
      datasets: [],
      trailingBytes: 0,
    });
  });
});

describe('packDatagrams', () => {
  it('combines datasets into one payload', () => {
    const a = fromHex('04 00 30 00');
    const b = fromHex('07 00 40 00 21 24 05');
    const packed = packDatagrams([a, b]);

    expect(packed).toHaveLength(1);
    expect(toHex(packed[0])).toBe('04 00 30 00 07 00 40 00 21 24 05');
  });

  it('starts a new payload when the size limit would be exceeded', () => {
    const dataset = fromHex('0A 00 40 00 E4 13 00 03 C1 35');
    const packed = packDatagrams([dataset, dataset, dataset], 25);

    expect(packed.map((p) => p.length)).toEqual([20, 10]);
  });

  it('returns nothing for no datasets', () => {
    expect(packDatagrams([])).toEqual([]);
  });
});
