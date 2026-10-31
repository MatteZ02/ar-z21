import {LocoInfo} from '../../protocol';
import {
  OWN_COMMAND_WINDOW_MS,
  SHARED_CONTROL_HOLD_MS,
  SharedControlDetector,
} from '../sharedControl';

const report = (overrides: Partial<LocoInfo> = {}): LocoInfo => ({
  address: 3,
  busy: false,
  speedSteps: 128,
  forward: true,
  speed: 0,
  emergencyStop: false,
  doubleTraction: false,
  smartSearch: false,
  functions: new Array<boolean>(29).fill(false),
  ...overrides,
});

const withFunction = (index: number, on: boolean): boolean[] => {
  const functions = new Array<boolean>(29).fill(false);
  functions[index] = on;
  return functions;
};

describe('SharedControlDetector', () => {
  it('is off for a loco it knows nothing about', () => {
    expect(new SharedControlDetector().isShared(3, 0)).toBe(false);
  });

  it('does not flag the first report, even if the loco is moving', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report({speed: 40}), 0);
    expect(detector.isShared(3, 0)).toBe(false);
  });

  it('does not flag changes this device caused', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report(), 0);
    detector.noteDrive(3, 10, true, 100);
    detector.noteDrive(3, 20, true, 200);
    detector.noteReport(report({speed: 10}), 250);
    detector.noteReport(report({speed: 20}), 300);
    detector.noteFunction(3, 0, true, 400);
    detector.noteReport(
      report({speed: 20, functions: withFunction(0, true)}),
      450,
    );
    expect(detector.isShared(3, 450)).toBe(false);
  });

  it('flags a speed change nobody here asked for', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report(), 0);
    expect(detector.noteReport(report({speed: 33}), 100)).toBe(true);
    expect(detector.isShared(3, 100)).toBe(true);
  });

  it('flags a direction or function change nobody here asked for', () => {
    const direction = new SharedControlDetector();
    direction.noteReport(report(), 0);
    direction.noteReport(report({forward: false}), 10);
    expect(direction.isShared(3, 10)).toBe(true);

    const fn = new SharedControlDetector();
    fn.noteReport(report(), 0);
    fn.noteFunction(3, 0, true, 5);
    fn.noteReport(report({functions: withFunction(1, true)}), 10);
    expect(fn.isShared(3, 10)).toBe(true);
  });

  it('switches the flag off after the hold time', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report(), 0);
    detector.noteReport(report({speed: 33}), 100);
    expect(detector.sharedUntil(3)).toBe(100 + SHARED_CONTROL_HOLD_MS);
    expect(detector.isShared(3, 100 + SHARED_CONTROL_HOLD_MS - 1)).toBe(true);
    expect(detector.isShared(3, 100 + SHARED_CONTROL_HOLD_MS)).toBe(false);
  });

  it('treats own commands as foreign once they are too old', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report(), 0);
    detector.noteDrive(3, 10, true, 0);
    detector.noteReport(report({speed: 10}), OWN_COMMAND_WINDOW_MS + 1);
    expect(detector.isShared(3, OWN_COMMAND_WINDOW_MS + 1)).toBe(true);
  });

  it('ignores emergency stops from any device', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report({speed: 50}), 0);
    detector.noteReport(report({speed: 0, emergencyStop: true}), 10);
    expect(detector.isShared(3, 10)).toBe(false);
  });

  it('follows the busy bit while it is set', () => {
    const detector = new SharedControlDetector();
    detector.noteReport(report({busy: true}), 0);
    expect(detector.isShared(3, 0)).toBe(true);
    expect(detector.sharedUntil(3)).toBeUndefined();
    expect(detector.noteReport(report({busy: false}), 10)).toBe(true);
    expect(detector.isShared(3, 10)).toBe(false);
  });
});
