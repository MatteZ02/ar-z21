import {maxSpeedStep, SpeedSteps} from '../protocol';
import {SpeedDisplay} from './types';

const KMH_PER_MPH = 1.609344;

export type ShownSpeed = {value: number; unit: SpeedDisplay};

// The speed the throttle shows for a speed step. km/h and mph scale the step
// linearly up to the loco's top speed, like the Roco Z21 app; the real speed
// curve depends on the decoder.
export const shownSpeed = (
  step: number,
  steps: SpeedSteps,
  maxSpeedKmh: number,
  display: SpeedDisplay,
): ShownSpeed => {
  if (display === 'step') {
    return {value: step, unit: 'step'};
  }
  const kmh = (step / maxSpeedStep(steps)) * maxSpeedKmh;
  return {
    value: Math.round(display === 'mph' ? kmh / KMH_PER_MPH : kmh),
    unit: display,
  };
};
