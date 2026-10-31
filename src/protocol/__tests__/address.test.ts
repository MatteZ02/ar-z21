import {
  decodeLocoAddress,
  encodeLocoAddress,
  isValidLocoAddress,
} from '../address';

describe('loco address (p. 23)', () => {
  it('encodes short addresses without the long-address flag', () => {
    expect(encodeLocoAddress(1)).toEqual([0x00, 0x01]);
    expect(encodeLocoAddress(127)).toEqual([0x00, 0x7f]);
  });

  it('encodes addresses >= 128 with 0xC0 in the MSB', () => {
    expect(encodeLocoAddress(128)).toEqual([0xc0, 0x80]);
    expect(encodeLocoAddress(1234)).toEqual([0xc4, 0xd2]);
    expect(encodeLocoAddress(10239)).toEqual([0xe7, 0xff]);
  });

  it('decodes and ignores the two highest MSB bits', () => {
    expect(decodeLocoAddress(0x00, 0x03)).toBe(3);
    expect(decodeLocoAddress(0xc4, 0xd2)).toBe(1234);
    expect(decodeLocoAddress(0x04, 0xd2)).toBe(1234);
  });

  it('round-trips every valid address', () => {
    for (let address = 1; address <= 10239; address++) {
      expect(decodeLocoAddress(...encodeLocoAddress(address))).toBe(address);
    }
  });

  it.each([0, -1, 10240, 3.5, NaN])('rejects %p', (address) => {
    expect(isValidLocoAddress(address)).toBe(false);
    expect(() => encodeLocoAddress(address)).toThrow(RangeError);
  });
});
