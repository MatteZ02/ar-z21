import {
  consistFromLead,
  convertOffset,
  isValidOffset,
  memberDrive,
  toMemberSteps,
} from '../consistMath';

const member = (
  speedSteps: 14 | 28 | 128,
  speedOffset = 0,
  reversed = false,
) => ({
  speedSteps,
  speedOffset,
  reversed,
});

describe('consist speed for members', () => {
  it('passes the speed through for 128-step members', () => {
    expect(memberDrive(60, true, member(128))).toEqual({
      speed: 60,
      forward: true,
    });
  });

  it('converts to other speed-step modes', () => {
    expect(toMemberSteps(126, 28)).toBe(28);
    expect(toMemberSteps(63, 28)).toBe(14);
    expect(toMemberSteps(126, 14)).toBe(14);
    // The slowest consist speed still moves a 14-step loco.
    expect(toMemberSteps(1, 14)).toBe(1);
  });

  it('adds the offset in the member’s own steps', () => {
    expect(memberDrive(63, true, member(28, 2))).toEqual({
      speed: 16,
      forward: true,
    });
    expect(memberDrive(60, true, member(128, -5))).toEqual({
      speed: 55,
      forward: true,
    });
  });

  it('never moves a member when the consist stands', () => {
    for (const offset of [-30, -1, 0, 1, 30]) {
      expect(memberDrive(0, true, member(128, offset)).speed).toBe(0);
      expect(memberDrive(0, false, member(28, offset, true)).speed).toBe(0);
    }
  });

  it('never stops or reverses a moving member through its offset', () => {
    expect(memberDrive(3, true, member(128, -30))).toEqual({
      speed: 1,
      forward: true,
    });
    expect(memberDrive(1, false, member(14, -30))).toEqual({
      speed: 1,
      forward: false,
    });
  });

  it('clamps to the member’s top step', () => {
    expect(memberDrive(126, true, member(128, 30)).speed).toBe(126);
    expect(memberDrive(120, true, member(28, 5)).speed).toBe(28);
  });

  it('reverses members coupled facing backwards', () => {
    expect(memberDrive(40, true, member(128, 0, true)).forward).toBe(false);
    expect(memberDrive(40, false, member(128, 0, true)).forward).toBe(true);
  });

  it('checks every combination against the safety rules', () => {
    for (const steps of [14, 28, 128] as const) {
      const top = steps === 128 ? 126 : steps;
      for (let speed = 0; speed <= 126; speed++) {
        for (const offset of [-30, -7, 0, 7, 30]) {
          for (const reversed of [false, true]) {
            for (const forward of [false, true]) {
              const result = memberDrive(
                speed,
                forward,
                member(steps, offset, reversed),
              );
              expect(result.forward).toBe(reversed ? !forward : forward);
              if (speed === 0) {
                expect(result.speed).toBe(0);
              } else {
                expect(result.speed).toBeGreaterThanOrEqual(1);
                expect(result.speed).toBeLessThanOrEqual(top);
              }
            }
          }
        }
      }
    }
  });
});

describe('consist speed shown from the lead loco', () => {
  it('reverses the conversion and the offset', () => {
    const lead = member(28, 2);
    const sent = memberDrive(63, true, lead);
    expect(consistFromLead(sent.speed, sent.forward, lead)).toEqual({
      speed: 63,
      forward: true,
    });
  });

  it('shows the consist direction for a reversed lead', () => {
    expect(consistFromLead(40, false, member(128, 0, true))).toEqual({
      speed: 40,
      forward: true,
    });
  });

  it('shows stop as stop', () => {
    expect(consistFromLead(0, true, member(128, 5)).speed).toBe(0);
  });
});

describe('offsets', () => {
  it('converts when a loco changes speed-step mode', () => {
    expect(convertOffset(4, 28, 128)).toBe(18);
    expect(convertOffset(18, 128, 28)).toBe(4);
    expect(convertOffset(-2, 14, 28)).toBe(-4);
  });

  it('limits the offset', () => {
    expect(isValidOffset(30)).toBe(true);
    expect(isValidOffset(-31)).toBe(false);
    expect(isValidOffset(1.5)).toBe(false);
  });
});
