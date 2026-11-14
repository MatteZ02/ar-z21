import {
  fractionFromHandle,
  HANDLE_COAST_ZONE,
  handleFromFraction,
  nextHandleSpeed,
} from '../powerHandle';

describe('power handle position', () => {
  it('coasts around the centre', () => {
    expect(handleFromFraction(0.5)).toBe(0);
    expect(handleFromFraction(0.5 + HANDLE_COAST_ZONE / 2)).toBe(0);
    expect(handleFromFraction(0.5 - HANDLE_COAST_ZONE / 2)).toBe(0);
  });

  it('gives full power at the top and full brake at the bottom', () => {
    expect(handleFromFraction(1)).toBe(1);
    expect(handleFromFraction(0)).toBe(-1);
    // Dragged past the ends.
    expect(handleFromFraction(1.3)).toBe(1);
    expect(handleFromFraction(-0.2)).toBe(-1);
  });

  it('is proportional between the coast zone and the ends', () => {
    const half = 0.5 + (HANDLE_COAST_ZONE + (1 - HANDLE_COAST_ZONE) / 2) / 2;
    expect(handleFromFraction(half)).toBe(0.5);
    expect(handleFromFraction(1 - half)).toBe(-0.5);
  });

  it('maps settings back to the same slider position', () => {
    for (const handle of [-1, -0.5, -0.01, 0, 0.25, 1]) {
      expect(handleFromFraction(fractionFromHandle(handle))).toBeCloseTo(
        handle,
      );
    }
  });
});

describe('power handle speed', () => {
  // 128 steps (top step 126) for 126 km/h: one step per km/h.
  const loco = {maxStep: 126, maxSpeedKmh: 126, acceleration: 5};

  it('accelerates by the acceleration per second at full power', () => {
    expect(nextHandleSpeed(0, 1, loco, 1000)).toBeCloseTo(5);
    expect(nextHandleSpeed(10, 1, loco, 100)).toBeCloseTo(10.5);
  });

  it('scales with the handle setting', () => {
    expect(nextHandleSpeed(0, 0.5, loco, 1000)).toBeCloseTo(2.5);
  });

  it('holds the speed when coasting', () => {
    expect(nextHandleSpeed(40, 0, loco, 1000)).toBe(40);
  });

  it('brakes at the same rate and stops at 0 without reversing', () => {
    expect(nextHandleSpeed(40, -1, loco, 1000)).toBeCloseTo(35);
    expect(nextHandleSpeed(2, -1, loco, 1000)).toBe(0);
  });

  it('never goes above the top speed', () => {
    expect(nextHandleSpeed(125, 1, loco, 1000)).toBe(126);
  });

  it('converts km/h to the throttle scale', () => {
    // 28 steps (top step 28) for 140 km/h: 5 km/h per step.
    const slow = {maxStep: 28, maxSpeedKmh: 140, acceleration: 10};
    expect(nextHandleSpeed(0, 1, slow, 1000)).toBeCloseTo(2);
  });
});
