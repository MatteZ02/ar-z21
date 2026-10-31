import {
  functionPagesPerView,
  MAX_FUNCTION_ROW_HEIGHT,
  SPLIT_MIN_WIDTH,
  throttleCount,
} from '../../ui/layout';
import {
  DEFAULT_THROTTLES,
  migrateSettings,
  withoutLoco,
  withSelection,
} from '../throttleSelection';

describe('throttle selections', () => {
  it('sets one throttle without touching the other', () => {
    const next = withSelection(DEFAULT_THROTTLES, 1, {
      kind: 'library',
      locoId: 7,
    });
    expect(next).toEqual([DEFAULT_THROTTLES[0], {kind: 'library', locoId: 7}]);
  });

  it('clears a deleted loco from every throttle', () => {
    const both = [
      {kind: 'library' as const, locoId: 7},
      {kind: 'library' as const, locoId: 7},
    ];
    expect(withoutLoco(both, 7)).toEqual([{kind: 'none'}, {kind: 'none'}]);
    expect(withoutLoco(both, 8)).toEqual(both);
  });
});

describe('settings migration', () => {
  it('moves the version 1 library loco to the first throttle', () => {
    const migrated = migrateSettings(
      {host: '10.0.0.2', driveLocoId: 5, locoAddress: 3, locoSpeedSteps: 128},
      1,
    );
    expect(migrated).toEqual({
      host: '10.0.0.2',
      throttles: [{kind: 'library', locoId: 5}, {kind: 'none'}],
    });
  });

  it('moves a version 1 plain address to the first throttle', () => {
    const migrated = migrateSettings(
      {driveLocoId: null, locoAddress: 44, locoSpeedSteps: 28},
      1,
    );
    expect(migrated.throttles).toEqual([
      {kind: 'address', address: 44, speedSteps: 28},
      {kind: 'none'},
    ]);
  });

  it('tolerates missing or broken data', () => {
    expect(migrateSettings(null, 1).throttles).toEqual([
      {kind: 'address', address: 3, speedSteps: 128},
      {kind: 'none'},
    ]);
  });

  it('leaves current settings alone', () => {
    const current = {throttles: DEFAULT_THROTTLES};
    expect(migrateSettings(current, 2)).toBe(current);
  });
});

describe('layout', () => {
  it('splits only on wide screens in landscape', () => {
    expect(throttleCount(390, 844)).toBe(1); // phone portrait
    expect(throttleCount(932, 430)).toBe(1); // largest phones in landscape
    expect(throttleCount(SPLIT_MIN_WIDTH, 700)).toBe(2);
    expect(throttleCount(1180, 820)).toBe(2); // tablet landscape
    expect(throttleCount(1024, 1366)).toBe(1); // large tablet portrait
  });

  it('stacks as many function pages as fit', () => {
    const page = 6 * MAX_FUNCTION_ROW_HEIGHT + 5 * 8;
    expect(functionPagesPerView(400, 6, 8, 3)).toBe(1);
    expect(functionPagesPerView(page, 6, 8, 3)).toBe(1);
    expect(functionPagesPerView(2 * page + 8, 6, 8, 3)).toBe(2);
    expect(functionPagesPerView(5000, 6, 8, 3)).toBe(3);
    expect(functionPagesPerView(5000, 6, 8, 1)).toBe(1);
  });
});
