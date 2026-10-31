import {LocoInfo} from '../../protocol';
import {
  applyChange,
  displayedLoco,
  emptyIntent,
  isIntentEmpty,
  LOCAL_CHANGE_HOLD_MS,
  reconcileIntent,
} from '../locoIntent';

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

describe('loco intent', () => {
  it('shows the report when nothing is pending', () => {
    const shown = displayedLoco(
      report({speed: 40, forward: false}),
      emptyIntent(),
    );
    expect(shown).toMatchObject({known: true, speed: 40, forward: false});
  });

  it('shows defaults before the first report', () => {
    expect(displayedLoco(null, emptyIntent())).toMatchObject({
      known: false,
      speed: 0,
      forward: true,
      emergencyStop: false,
    });
  });

  it('shows a pending speed over an older report', () => {
    const intent = applyChange(emptyIntent(), {kind: 'speed', speed: 30}, 1000);
    expect(displayedLoco(report({speed: 10}), intent).speed).toBe(30);
  });

  it('lets repeated quick changes build on each other', () => {
    // Three "+10" taps before any report arrives.
    let intent = emptyIntent();
    let shown = displayedLoco(report(), intent);
    for (let tap = 0; tap < 3; tap++) {
      intent = applyChange(
        intent,
        {kind: 'speed', speed: shown.speed + 10},
        tap,
      );
      shown = displayedLoco(report(), intent);
    }
    expect(shown.speed).toBe(30);
  });

  it('keeps the pending speed when an echo of an older command arrives', () => {
    const intent = applyChange(emptyIntent(), {kind: 'speed', speed: 30}, 1000);
    const next = reconcileIntent(intent, report({speed: 20}), 1100);
    expect(next.speed).toBe(30);
  });

  it('drops the pending speed once the report confirms it', () => {
    const intent = applyChange(emptyIntent(), {kind: 'speed', speed: 30}, 1000);
    const next = reconcileIntent(intent, report({speed: 30}), 1100);
    expect(isIntentEmpty(next)).toBe(true);
  });

  it('lets the report win after the hold time', () => {
    const intent = applyChange(emptyIntent(), {kind: 'speed', speed: 30}, 1000);
    const next = reconcileIntent(
      intent,
      report({speed: 12}),
      1000 + LOCAL_CHANGE_HOLD_MS,
    );
    expect(isIntentEmpty(next)).toBe(true);
    expect(displayedLoco(report({speed: 12}), next).speed).toBe(12);
  });

  it('matches an emergency stop only against an emergency-stop report', () => {
    const intent = applyChange(emptyIntent(), {kind: 'emergencyStop'}, 0);
    expect(displayedLoco(report({speed: 50}), intent)).toMatchObject({
      speed: 0,
      emergencyStop: true,
    });
    expect(reconcileIntent(intent, report({speed: 0}), 10).speed).toBe(0);
    const confirmed = reconcileIntent(
      intent,
      report({speed: 0, emergencyStop: true}),
      10,
    );
    expect(isIntentEmpty(confirmed)).toBe(true);
  });

  it('clears the emergency stop when a speed is set', () => {
    let intent = applyChange(emptyIntent(), {kind: 'emergencyStop'}, 0);
    intent = applyChange(intent, {kind: 'speed', speed: 5}, 10);
    expect(
      displayedLoco(report({speed: 0, emergencyStop: true}), intent),
    ).toMatchObject({speed: 5, emergencyStop: false});
  });

  it('handles direction and functions separately', () => {
    let intent = applyChange(
      emptyIntent(),
      {kind: 'direction', forward: false},
      0,
    );
    intent = applyChange(intent, {kind: 'function', index: 0, on: true}, 0);
    intent = applyChange(intent, {kind: 'function', index: 5, on: true}, 0);

    const shown = displayedLoco(report(), intent);
    expect(shown.forward).toBe(false);
    expect(shown.functions[0]).toBe(true);
    expect(shown.functions[5]).toBe(true);

    const functions = report().functions;
    functions[0] = true;
    const next = reconcileIntent(intent, report({functions}), 100);
    expect(next.forward).toBe(false);
    expect(next.functions).toEqual({5: true});
  });
});
