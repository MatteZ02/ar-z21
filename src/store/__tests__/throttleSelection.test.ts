import {
  functionPagesPerView,
  MAX_FUNCTION_ROW_HEIGHT,
  SPLIT_MIN_WIDTH,
  throttleCount,
} from '../../ui/layout';
import {Consist, emptyDetails, Loco} from '../../library/types';
import {
  consistConflicts,
  DEFAULT_THROTTLES,
  migrateSettings,
  selectionAddresses,
  ThrottleSelection,
  withoutVehicle,
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

  it('clears a deleted loco or consist from every throttle', () => {
    const both = [
      {kind: 'library' as const, locoId: 7},
      {kind: 'consist' as const, consistId: 7},
    ];
    expect(withoutVehicle(both, {kind: 'loco', id: 7})).toEqual([
      {kind: 'none'},
      both[1],
    ]);
    expect(withoutVehicle(both, {kind: 'consist', id: 7})).toEqual([
      both[0],
      {kind: 'none'},
    ]);
    expect(withoutVehicle(both, {kind: 'loco', id: 8})).toEqual(both);
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
      recent: [],
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

  it('turns version 2 recent loco ids into recent entries', () => {
    expect(
      migrateSettings({throttles: DEFAULT_THROTTLES, recentLocoIds: [4, 2]}, 2),
    ).toEqual({
      throttles: DEFAULT_THROTTLES,
      recent: [
        {kind: 'loco', id: 4},
        {kind: 'loco', id: 2},
      ],
    });
  });

  it('leaves current settings alone', () => {
    const current = {throttles: DEFAULT_THROTTLES, recent: []};
    expect(migrateSettings(current, 3)).toBe(current);
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

describe('consist conflicts between throttles', () => {
  const loco = (id: number, address: number): Loco => ({
    id,
    name: `Loco ${id}`,
    address,
    speedSteps: 128,
    maxSpeed: 100,
    speedDisplay: 'kmh',
    acceleration: 5,
    photo: null,
    notes: '',
    details: emptyDetails(),
    functions: [],
  });
  const locos = [loco(1, 6503), loco(2, 6519), loco(3, 95)];
  const consists: Consist[] = [
    {
      id: 10,
      name: 'Double vectron',
      photo: null,
      members: [
        {locoId: 1, reversed: false, speedOffset: 0},
        {locoId: 2, reversed: true, speedOffset: 0},
      ],
    },
  ];
  const consist: ThrottleSelection = {kind: 'consist', consistId: 10};

  it('lists the addresses a throttle drives', () => {
    expect(selectionAddresses(consist, locos, consists)).toEqual([6503, 6519]);
    expect(
      selectionAddresses({kind: 'library', locoId: 3}, locos, consists),
    ).toEqual([95]);
    expect(selectionAddresses({kind: 'none'}, locos, consists)).toEqual([]);
  });

  it('finds a consist member driven alone on the other throttle', () => {
    expect(
      consistConflicts(consist, {kind: 'library', locoId: 2}, locos, consists),
    ).toEqual([6519]);
    expect(
      consistConflicts(
        consist,
        {kind: 'address', address: 6503, speedSteps: 128},
        locos,
        consists,
      ),
    ).toEqual([6503]);
    // And the other way round.
    expect(
      consistConflicts({kind: 'library', locoId: 1}, consist, locos, consists),
    ).toEqual([6503]);
  });

  it('allows the same loco, or the same consist, on both throttles', () => {
    const single: ThrottleSelection = {kind: 'library', locoId: 1};
    expect(consistConflicts(single, single, locos, consists)).toEqual([]);
    expect(consistConflicts(consist, consist, locos, consists)).toEqual([]);
    expect(
      consistConflicts(consist, {kind: 'library', locoId: 3}, locos, consists),
    ).toEqual([]);
  });
});
