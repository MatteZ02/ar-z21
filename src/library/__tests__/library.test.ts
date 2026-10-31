import {
  defaultFunctions,
  MAX_SLOTS,
  nextFreeNumber,
  pageRows,
  slotAt,
  usedPages,
} from '../functionSlots';
import {functionIcon, isFunctionIconId} from '../icons';
import {existingRecent, MAX_RECENT_LOCOS, withRecent} from '../recent';
import {shownSpeed} from '../speedDisplay';
import {emptyDetails, LocoDraft, LocoFunction} from '../types';
import {validateDraft} from '../validation';

const fn = (number: number, slot: number): LocoFunction => ({
  number,
  name: '',
  icon: 'none',
  momentary: false,
  slot,
});

describe('function slots', () => {
  it('numbers slots column by column, page by page (as the Roco export)', () => {
    expect(slotAt(0, 0, 0)).toBe(0);
    expect(slotAt(0, 5, 0)).toBe(5);
    expect(slotAt(0, 0, 1)).toBe(6);
    expect(slotAt(0, 5, 1)).toBe(11);
    expect(slotAt(1, 0, 0)).toBe(12);
    expect(slotAt(2, 5, 1)).toBe(35);
  });

  it('lays out the first page of the sample loco like the Roco app', () => {
    // From the Roco export: SBB Vectron 6503, positions 0..11 (4 is empty).
    const functions = [
      fn(0, 0),
      fn(24, 1),
      fn(1, 2),
      fn(23, 3),
      fn(27, 5),
      fn(8, 6),
      fn(25, 7),
      fn(22, 8),
      fn(2, 9),
      fn(3, 10),
      fn(26, 11),
    ];
    const numbers = pageRows(functions, 0).map((row) =>
      row.map((cell) => cell?.number ?? null),
    );
    // Same as driving_phone.PNG: left column F0 F24 F1 F23 (empty) F27.
    expect(numbers).toEqual([
      [0, 8],
      [24, 25],
      [1, 22],
      [23, 2],
      [null, 3],
      [27, 26],
    ]);
  });

  it('counts the pages in use', () => {
    expect(usedPages([])).toBe(1);
    expect(usedPages([fn(0, 0)])).toBe(1);
    expect(usedPages([fn(0, 0), fn(1, 12)])).toBe(2);
    expect(usedPages([fn(0, 35)])).toBe(3);
  });

  it('finds the lowest free function number', () => {
    expect(nextFreeNumber([])).toBe(0);
    expect(nextFreeNumber([fn(0, 0), fn(1, 1), fn(3, 2)])).toBe(2);
    const all = Array.from({length: 32}, (_, n) => fn(n, n));
    expect(nextFreeNumber(all)).toBeNull();
  });

  it('gives new locos F0..F12 with a light on F0', () => {
    const functions = defaultFunctions();
    expect(functions.map((f) => f.number)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(functions[0].icon).toBe('light');
    expect(functions.every((f) => f.slot < MAX_SLOTS)).toBe(true);
  });
});

describe('speed display', () => {
  it('shows the speed step', () => {
    expect(shownSpeed(63, 128, 200, 'step')).toEqual({value: 63, unit: 'step'});
  });

  it('scales the step to the top speed in km/h', () => {
    expect(shownSpeed(126, 128, 200, 'kmh').value).toBe(200);
    expect(shownSpeed(63, 128, 200, 'kmh').value).toBe(100);
    expect(shownSpeed(14, 28, 140, 'kmh').value).toBe(70);
    expect(shownSpeed(0, 14, 140, 'kmh').value).toBe(0);
  });

  it('converts to mph', () => {
    expect(shownSpeed(126, 128, 160, 'mph').value).toBe(99);
  });
});

describe('draft validation', () => {
  const draft = (overrides: Partial<LocoDraft> = {}): LocoDraft => ({
    name: 'Vectron',
    address: 6503,
    speedSteps: 128,
    maxSpeed: 200,
    speedDisplay: 'kmh',
    photo: null,
    notes: '',
    details: emptyDetails(),
    functions: defaultFunctions(),
    ...overrides,
  });

  it('accepts a complete loco', () => {
    expect(validateDraft(draft())).toEqual([]);
  });

  it('needs a name, a DCC address and a sensible top speed', () => {
    expect(validateDraft(draft({name: '  '}))).toEqual(['nameMissing']);
    expect(validateDraft(draft({address: 0}))).toEqual(['addressInvalid']);
    expect(validateDraft(draft({address: 10240}))).toEqual(['addressInvalid']);
    expect(validateDraft(draft({maxSpeed: 0}))).toEqual(['maxSpeedInvalid']);
    expect(validateDraft(draft({maxSpeed: 12.5}))).toEqual(['maxSpeedInvalid']);
  });

  it('rejects duplicate or out-of-range functions and slots', () => {
    expect(validateDraft(draft({functions: [fn(0, 0), fn(0, 1)]}))).toEqual([
      'functionNumberDuplicate',
    ]);
    expect(validateDraft(draft({functions: [fn(32, 0)]}))).toEqual([
      'functionNumberInvalid',
    ]);
    expect(validateDraft(draft({functions: [fn(0, 3), fn(1, 3)]}))).toEqual([
      'functionSlotDuplicate',
    ]);
    expect(validateDraft(draft({functions: [fn(0, MAX_SLOTS)]}))).toEqual([
      'functionSlotInvalid',
    ]);
  });
});

describe('function icons', () => {
  it('knows its own ids and falls back for unknown ones', () => {
    expect(isFunctionIconId('horn')).toBe(true);
    expect(functionIcon('horn')).toBe('bullhorn');
    expect(functionIcon('none')).toBeNull();
    expect(isFunctionIconId('main_beam')).toBe(false);
    expect(functionIcon('main_beam')).toBeNull();
  });
});

describe('recent locos', () => {
  it('puts the latest first without duplicates', () => {
    expect(withRecent([3, 2, 1], 2)).toEqual([2, 3, 1]);
    expect(withRecent([], 7)).toEqual([7]);
  });

  it('keeps at most the limit', () => {
    const many = Array.from({length: MAX_RECENT_LOCOS}, (_, i) => i);
    expect(withRecent(many, 99)).toHaveLength(MAX_RECENT_LOCOS);
    expect(withRecent(many, 99)[0]).toBe(99);
  });

  it('forgets deleted locos', () => {
    expect(existingRecent([4, 5, 6], new Set([4, 6]))).toEqual([4, 6]);
  });
});
