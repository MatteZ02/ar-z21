import {GlobalStopTapper, STOP_DOUBLE_TAP_WINDOW_MS} from '../globalStop';

const tapperAt = (times: number[]) => {
  let index = 0;
  return new GlobalStopTapper(() => times[index++]);
};

describe('GlobalStopTapper', () => {
  it('sends emergency stop on a single tap', () => {
    expect(tapperAt([1000]).tap('emergencyStopThenPowerOff')).toBe(
      'emergencyStop',
    );
  });

  it('switches power off on a quick second tap', () => {
    const tapper = tapperAt([1000, 1000 + STOP_DOUBLE_TAP_WINDOW_MS]);
    expect(tapper.tap('emergencyStopThenPowerOff')).toBe('emergencyStop');
    expect(tapper.tap('emergencyStopThenPowerOff')).toBe('powerOff');
  });

  it('keeps sending power off while taps keep coming quickly', () => {
    const tapper = tapperAt([0, 300, 600, 900]);
    const actions = [0, 1, 2, 3].map(() =>
      tapper.tap('emergencyStopThenPowerOff'),
    );
    expect(actions).toEqual([
      'emergencyStop',
      'powerOff',
      'powerOff',
      'powerOff',
    ]);
  });

  it('treats a slow second tap as a new single tap', () => {
    const tapper = tapperAt([1000, 1001 + STOP_DOUBLE_TAP_WINDOW_MS]);
    expect(tapper.tap('emergencyStopThenPowerOff')).toBe('emergencyStop');
    expect(tapper.tap('emergencyStopThenPowerOff')).toBe('emergencyStop');
  });

  it('follows the emergency-stop-only mode', () => {
    const tapper = tapperAt([0, 100]);
    expect(tapper.tap('emergencyStopOnly')).toBe('emergencyStop');
    expect(tapper.tap('emergencyStopOnly')).toBe('emergencyStop');
  });

  it('follows the power-off mode', () => {
    const tapper = tapperAt([0, 5000]);
    expect(tapper.tap('powerOff')).toBe('powerOff');
    expect(tapper.tap('powerOff')).toBe('powerOff');
  });
});
