// What the global STOP control does when tapped. Chosen in settings.
export type StopMode =
  // One tap: emergency stop (track stays powered). A second tap within
  // STOP_DOUBLE_TAP_WINDOW_MS: track power off as well. The default.
  | 'emergencyStopThenPowerOff'
  // Every tap: emergency stop only.
  | 'emergencyStopOnly'
  // Every tap: track power off.
  | 'powerOff';

export const DEFAULT_STOP_MODE: StopMode = 'emergencyStopThenPowerOff';

// Two taps closer together than this count as a double tap.
export const STOP_DOUBLE_TAP_WINDOW_MS = 600;

export type StopAction = 'emergencyStop' | 'powerOff';

// Decides what each tap on the global STOP sends. The first tap acts at once;
// it never waits to see whether a second tap follows.
export class GlobalStopTapper {
  private lastTapAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly now: () => number = Date.now) {}

  tap(mode: StopMode): StopAction {
    const time = this.now();
    const quickRepeat = time - this.lastTapAt <= STOP_DOUBLE_TAP_WINDOW_MS;
    this.lastTapAt = time;
    switch (mode) {
      case 'emergencyStopOnly':
        return 'emergencyStop';
      case 'powerOff':
        return 'powerOff';
      case 'emergencyStopThenPowerOff':
        // Every further quick tap also means power off, so hammering the
        // button never switches back to "emergency stop only".
        return quickRepeat ? 'powerOff' : 'emergencyStop';
    }
  }
}
