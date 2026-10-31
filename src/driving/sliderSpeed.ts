// The bottom part of the speed slider that always means "stop", so dragging
// down to stop works even if the finger ends a little above the edge.
export const SLIDER_STOP_ZONE = 0.04;

// Speed step for a touch on the vertical slider: `offset` is the distance
// from the slider's top edge (may be outside 0..height while dragging).
export const sliderSpeed = (
  offset: number,
  height: number,
  max: number,
): number => {
  if (height <= 0) {
    return 0;
  }
  const fraction = 1 - offset / height;
  if (fraction <= SLIDER_STOP_ZONE) {
    return 0;
  }
  const scaled = (fraction - SLIDER_STOP_ZONE) / (1 - SLIDER_STOP_ZONE);
  return Math.min(max, Math.max(0, Math.round(scaled * max)));
};
