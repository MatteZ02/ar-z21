// Power handle drive mode: the slider is a combined power/brake handle, as
// in a real cab. Centre = coast (speed held), up = accelerate, down = brake.
// The app turns the handle into speed over time and sends the speed steps;
// the loco's acceleration (km/h per second) sets how fast. Pure functions.

// The band around the centre (as a share of each half) that means coast, so
// the handle is easy to put back to neutral.
export const HANDLE_COAST_ZONE = 0.08;

// How often the app recomputes the speed while the handle is off centre.
// The connection sends at most one drive command per loco per
// THROTTLE_INTERVAL_MS anyway, and nothing when the step does not change.
export const HANDLE_TICK_MS = 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Handle setting (-1 full brake … 0 coast … +1 full power) for a slider
// position (0 = bottom, 1 = top; may be outside while dragging).
export const handleFromFraction = (fraction: number): number => {
  const centred = clamp(fraction, 0, 1) * 2 - 1;
  const magnitude = Math.abs(centred);
  if (magnitude <= HANDLE_COAST_ZONE) {
    return 0;
  }
  // Rounded to whole percent, so tiny finger movements do not count.
  const scaled = (magnitude - HANDLE_COAST_ZONE) / (1 - HANDLE_COAST_ZONE);
  return (Math.sign(centred) * Math.round(scaled * 100)) / 100;
};

// Slider position for a handle setting: the inverse of handleFromFraction.
export const fractionFromHandle = (handle: number): number => {
  const h = clamp(handle, -1, 1);
  if (h === 0) {
    return 0.5;
  }
  const magnitude = HANDLE_COAST_ZONE + Math.abs(h) * (1 - HANDLE_COAST_ZONE);
  return 0.5 + (Math.sign(h) * magnitude) / 2;
};

export type HandleLoco = {
  // Top of the throttle's speed scale (e.g. 126 for 128 steps).
  maxStep: number;
  // Top speed in km/h, reached at maxStep.
  maxSpeedKmh: number;
  // km/h per second at full power; braking at full brake uses the same rate.
  acceleration: number;
};

// The next speed, in (fractional) speed steps: the handle setting times the
// loco's acceleration, over the elapsed time. Never below 0 (braking stops,
// it does not reverse) and never above the top speed.
export const nextHandleSpeed = (
  speed: number,
  handle: number,
  loco: HandleLoco,
  elapsedMs: number,
): number => {
  if (loco.maxSpeedKmh <= 0 || elapsedMs <= 0) {
    return clamp(speed, 0, loco.maxStep);
  }
  const stepsPerSecond = (loco.acceleration / loco.maxSpeedKmh) * loco.maxStep;
  const change = clamp(handle, -1, 1) * stepsPerSecond * (elapsedMs / 1000);
  return clamp(speed + change, 0, loco.maxStep);
};
