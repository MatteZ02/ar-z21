import {
  decodeSpeedByte,
  encodeSpeedByte,
  maxSpeedStep,
  SpeedSteps,
  speedStepsFromLocoInfo,
} from '../speed';

const moving = (speed: number, forward = true) => ({
  forward,
  speed,
  emergencyStop: false,
});

// The complete "DCC 28" table from spec p. 24, as step -> RVVVVVVV with R=0.
// Written out in full because the bit ordering is easy to get wrong.
const DCC28_TABLE: [number, number][] = [
  [1, 0b00000010],
  [2, 0b00010010],
  [3, 0b00000011],
  [4, 0b00010011],
  [5, 0b00000100],
  [6, 0b00010100],
  [7, 0b00000101],
  [8, 0b00010101],
  [9, 0b00000110],
  [10, 0b00010110],
  [11, 0b00000111],
  [12, 0b00010111],
  [13, 0b00001000],
  [14, 0b00011000],
  [15, 0b00001001],
  [16, 0b00011001],
  [17, 0b00001010],
  [18, 0b00011010],
  [19, 0b00001011],
  [20, 0b00011011],
  [21, 0b00001100],
  [22, 0b00011100],
  [23, 0b00001101],
  [24, 0b00011101],
  [25, 0b00001110],
  [26, 0b00011110],
  [27, 0b00001111],
  [28, 0b00011111],
];

describe('28 speed steps', () => {
  it.each(DCC28_TABLE)('step %i encodes per the spec table', (step, byte) => {
    expect(encodeSpeedByte(28, moving(step, false))).toBe(byte);
    expect(encodeSpeedByte(28, moving(step, true))).toBe(0x80 | byte);
  });

  it.each(DCC28_TABLE)('step %i decodes per the spec table', (step, byte) => {
    expect(decodeSpeedByte(28, byte)).toEqual(moving(step, false));
    expect(decodeSpeedByte(28, 0x80 | byte)).toEqual(moving(step, true));
  });

  it('decodes "Stop1" (0x10) as stop and "E-Stop1" (0x11) as e-stop', () => {
    expect(decodeSpeedByte(28, 0x10)).toEqual(moving(0, false));
    expect(decodeSpeedByte(28, 0x91)).toEqual({
      forward: true,
      speed: 0,
      emergencyStop: true,
    });
  });

  it('never encodes Stop1 or E-Stop1', () => {
    expect(encodeSpeedByte(28, moving(0))).toBe(0x80);
    expect(
      encodeSpeedByte(28, {forward: true, speed: 0, emergencyStop: true}),
    ).toBe(0x81);
  });
});

describe('14 speed steps (p. 24)', () => {
  it('step n is n + 1, bits 4-6 stay 0', () => {
    expect(encodeSpeedByte(14, moving(1, false))).toBe(0x02);
    expect(encodeSpeedByte(14, moving(14, false))).toBe(0x0f);
    expect(encodeSpeedByte(14, moving(7, true))).toBe(0x88);
  });

  it('decodes stop, e-stop and steps', () => {
    expect(decodeSpeedByte(14, 0x00)).toEqual(moving(0, false));
    expect(decodeSpeedByte(14, 0x01)).toEqual({
      forward: false,
      speed: 0,
      emergencyStop: true,
    });
    expect(decodeSpeedByte(14, 0x8f)).toEqual(moving(14, true));
  });
});

describe('128 speed steps (p. 24)', () => {
  it('step n is n + 1', () => {
    expect(encodeSpeedByte(128, moving(1, false))).toBe(0x02);
    expect(encodeSpeedByte(128, moving(126, false))).toBe(0x7f);
    expect(encodeSpeedByte(128, moving(126, true))).toBe(0xff);
  });

  it('decodes stop, e-stop and steps', () => {
    expect(decodeSpeedByte(128, 0x80)).toEqual(moving(0, true));
    expect(decodeSpeedByte(128, 0x81)).toEqual({
      forward: true,
      speed: 0,
      emergencyStop: true,
    });
    expect(decodeSpeedByte(128, 0x7f)).toEqual(moving(126, false));
  });
});

describe('round trip', () => {
  it.each<SpeedSteps>([14, 28, 128])(
    'every step survives encode and decode in %i-step mode',
    (steps) => {
      for (let speed = 0; speed <= maxSpeedStep(steps); speed++) {
        for (const forward of [true, false]) {
          const value = moving(speed, forward);
          expect(decodeSpeedByte(steps, encodeSpeedByte(steps, value))).toEqual(
            value,
          );
        }
      }
    },
  );
});

describe('validation', () => {
  it.each<[SpeedSteps, number]>([
    [14, 15],
    [28, 29],
    [128, 127],
    [128, -1],
    [128, 1.5],
  ])('rejects %i steps with speed %d', (steps, speed) => {
    expect(() => encodeSpeedByte(steps, moving(speed))).toThrow(RangeError);
  });
});

describe('speedStepsFromLocoInfo (p. 28)', () => {
  it('maps KKK codes 0/2/4 and ignores other bits', () => {
    expect(speedStepsFromLocoInfo(0)).toBe(14);
    expect(speedStepsFromLocoInfo(2)).toBe(28);
    expect(speedStepsFromLocoInfo(4)).toBe(128);
    expect(speedStepsFromLocoInfo(0x0c)).toBe(128); // busy bit set
    expect(speedStepsFromLocoInfo(3)).toBeUndefined();
  });
});
