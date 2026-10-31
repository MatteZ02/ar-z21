// Two throttles side by side from this window width (dp) up (brief §6.6):
// tablets in landscape and large tablets in portrait. Phones stay single,
// also in landscape (the widest phones are about 930 dp).
export const SPLIT_MIN_WIDTH = 960;

export const throttleCount = (windowWidth: number): 1 | 2 =>
  windowWidth >= SPLIT_MIN_WIDTH ? 2 : 1;
