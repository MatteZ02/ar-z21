import {toHex} from '../../protocol';
import {
  DriveRequest,
  DriveThrottle,
  THROTTLE_INTERVAL_MS,
} from '../driveThrottle';

const loco = (
  address: number,
  speed: number,
  forward = true,
): DriveRequest => ({
  address,
  steps: 128,
  speed,
  forward,
});

const setup = () => {
  const sends: string[][] = [];
  const throttle = new DriveThrottle((datasets) =>
    sends.push(datasets.map((d) => toHex(d))),
  );
  return {throttle, sends};
};

// Speed byte for a forward 128-step loco: 0x80 | (step + 1).
const speedByteOf = (hex: string) => parseInt(hex.split(' ')[8], 16);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DriveThrottle', () => {
  it('sends the first change on the next tick', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 10));
    expect(sends).toHaveLength(0);
    jest.advanceTimersByTime(0);
    expect(sends).toHaveLength(1);
    expect(speedByteOf(sends[0][0])).toBe(0x80 | 11);
  });

  it('coalesces a drag to at most one command per interval, latest value', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 1));
    jest.advanceTimersByTime(0);
    for (let speed = 2; speed <= 9; speed++) {
      jest.advanceTimersByTime(10);
      throttle.set(loco(3, speed));
    }
    // 80 ms in: nothing beyond the first send yet.
    expect(sends).toHaveLength(1);
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS - 80);
    expect(sends).toHaveLength(2);
    expect(speedByteOf(sends[1][0])).toBe(0x80 | 10); // step 9
  });

  it('always sends the final value of a gesture', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(0);
    throttle.set(loco(3, 6));
    throttle.set(loco(3, 0)); // released at stop
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(2);
    expect(speedByteOf(sends[1][0])).toBe(0x80);
  });

  it('does not send an unchanged value', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(0);
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS * 3);
    expect(sends).toHaveLength(1);
  });

  it('sends a direction change at the same speed', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5, true));
    jest.advanceTimersByTime(0);
    throttle.set(loco(3, 5, false));
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(2);
  });

  it('resends a value after the central unit reported a different one', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(0);
    // Another controller stopped the loco.
    throttle.noteReported({
      address: 3,
      busy: false,
      speedSteps: 128,
      forward: true,
      speed: 0,
      emergencyStop: false,
      doubleTraction: false,
      smartSearch: false,
      functions: [],
    });
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(2);
  });

  it('packs several locos changed together into one send', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    throttle.set(loco(4, 5));
    throttle.set(loco(1234, 5));
    jest.advanceTimersByTime(0);
    expect(sends).toHaveLength(1);
    expect(sends[0]).toHaveLength(3);
  });

  it('stops ticking when idle and starts again on the next change', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(0);
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS * 5);
    expect(jest.getTimerCount()).toBe(0);
    throttle.set(loco(3, 6));
    jest.advanceTimersByTime(0);
    expect(sends).toHaveLength(2);
  });

  it('cancel drops a pending command and forgets the known state', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(0);
    throttle.set(loco(3, 50));
    throttle.cancel(3);
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(1);
    // Same value as before the cancel is sent again.
    throttle.set(loco(3, 5));
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(2);
  });

  it('cancelAll drops pending commands for every loco', () => {
    const {throttle, sends} = setup();
    throttle.set(loco(3, 5));
    throttle.set(loco(4, 5));
    throttle.cancelAll();
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(sends).toHaveLength(0);
  });
});
