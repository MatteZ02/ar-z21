// Recently driven locos for the quick-switch strip (brief §6.5).
export const MAX_RECENT_LOCOS = 10;

// Moves the loco to the front, without duplicates, keeping at most the limit.
export const withRecent = (
  recent: number[],
  locoId: number,
  limit = MAX_RECENT_LOCOS,
): number[] =>
  [locoId, ...recent.filter((id) => id !== locoId)].slice(0, limit);

// Drops ids of locos that no longer exist.
export const existingRecent = (
  recent: number[],
  existingIds: Set<number>,
): number[] => recent.filter((id) => existingIds.has(id));
