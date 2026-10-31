import {SLIDER_STOP_ZONE, sliderSpeed} from '../sliderSpeed';

describe('sliderSpeed', () => {
  const height = 1000;

  it('gives full speed at the top and above it', () => {
    expect(sliderSpeed(0, height, 126)).toBe(126);
    expect(sliderSpeed(-50, height, 126)).toBe(126);
  });

  it('stops at the bottom, below it and in the stop zone', () => {
    expect(sliderSpeed(height, height, 126)).toBe(0);
    expect(sliderSpeed(height + 80, height, 126)).toBe(0);
    expect(sliderSpeed(height * (1 - SLIDER_STOP_ZONE), height, 126)).toBe(0);
  });

  it('scales linearly in between', () => {
    expect(sliderSpeed(height * 0.48, height, 126)).toBe(63);
    expect(sliderSpeed(height * 0.48, height, 28)).toBe(14);
  });

  it('is safe before the slider has a size', () => {
    expect(sliderSpeed(10, 0, 126)).toBe(0);
  });
});
