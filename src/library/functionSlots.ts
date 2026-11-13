import {LocoFunction} from './types';

// The function grid, as in the Roco Z21 app: pages (CI, CII, CIII) of two
// columns by six rows. Slots are numbered page by page and, within a page,
// column by column: slot 0..5 is the left column of page 1, 6..11 the right.
// This matches the `position` column of the Roco export.
export const SLOT_COLUMNS = 2;
export const SLOT_ROWS = 6;
export const SLOTS_PER_PAGE = SLOT_COLUMNS * SLOT_ROWS;
export const FUNCTION_PAGES = 3;
export const MAX_SLOTS = SLOTS_PER_PAGE * FUNCTION_PAGES;

export const MAX_FUNCTION_NUMBER = 31;

export const slotAt = (page: number, row: number, column: number): number =>
  page * SLOTS_PER_PAGE + column * SLOT_ROWS + row;

// One page as rows of cells, ready to render: rows[row][column] is the
// function in that slot, or null for an empty slot.
export const pageRows = (
  functions: LocoFunction[],
  page: number,
): (LocoFunction | null)[][] => {
  const bySlot = new Map(functions.map((fn) => [fn.slot, fn]));
  return Array.from({length: SLOT_ROWS}, (_, row) =>
    Array.from(
      {length: SLOT_COLUMNS},
      (_, column) => bySlot.get(slotAt(page, row, column)) ?? null,
    ),
  );
};

// Number of pages that are worth showing: at least one, and every page that
// holds a function.
export const usedPages = (functions: LocoFunction[]): number =>
  Math.min(
    FUNCTION_PAGES,
    Math.max(
      1,
      ...functions.map((fn) => Math.floor(fn.slot / SLOTS_PER_PAGE) + 1),
    ),
  );

// Lowest function number not yet used, or null if all are taken.
export const nextFreeNumber = (functions: LocoFunction[]): number | null => {
  const used = new Set(functions.map((fn) => fn.number));
  for (let number = 0; number <= MAX_FUNCTION_NUMBER; number++) {
    if (!used.has(number)) {
      return number;
    }
  }
  return null;
};

// Slot of the n-th default function: filled row by row, left then right
// (F0 F1 on the first row, F2 F3 on the second, …), page after page.
export const defaultSlot = (index: number): number => {
  const page = Math.floor(index / SLOTS_PER_PAGE);
  const onPage = index % SLOTS_PER_PAGE;
  return slotAt(page, Math.floor(onPage / SLOT_COLUMNS), onPage % SLOT_COLUMNS);
};

// A new loco gets F0..F(count - 1) in order, F0 with the light icon.
export const defaultFunctions = (count = 13): LocoFunction[] =>
  Array.from({length: count}, (_, number) => ({
    number,
    name: '',
    icon: number === 0 ? 'light' : 'none',
    momentary: false,
    slot: defaultSlot(number),
  }));
