// Two throttles side by side from this window width (dp) up, and only in
// landscape (brief §6.6; decided by the user). Phones stay single: the widest
// phones are about 930 dp in landscape.
export const SPLIT_MIN_WIDTH = 960;

export const throttleCount = (
  windowWidth: number,
  windowHeight: number,
): 1 | 2 =>
  windowWidth >= SPLIT_MIN_WIDTH && windowWidth > windowHeight ? 2 : 1;

// Function buttons grow with the space up to this height (dp), so they do
// not become tall slabs on tablets in portrait.
export const MAX_FUNCTION_ROW_HEIGHT = 96;

// How many function pages fit stacked in the given height. Taller screens
// show more pages at once (decided by the user); at least one.
export const functionPagesPerView = (
  height: number,
  rowsPerPage: number,
  rowGap: number,
  pageCount: number,
): number => {
  const pageHeight =
    rowsPerPage * MAX_FUNCTION_ROW_HEIGHT + (rowsPerPage - 1) * rowGap;
  const fitting = Math.floor((height + rowGap) / (pageHeight + rowGap));
  return Math.max(1, Math.min(pageCount, fitting));
};
