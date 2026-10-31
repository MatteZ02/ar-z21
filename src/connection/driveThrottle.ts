import {lanXSetLocoDrive, LocoInfo, SpeedSteps} from '../protocol';

// At most one drive command per loco per interval (brief §5).
export const THROTTLE_INTERVAL_MS = 100;

export type DriveRequest = {
  address: number;
  steps: SpeedSteps;
  speed: number;
  forward: boolean;
};

const sameDrive = (a: DriveRequest, b: DriveRequest): boolean =>
  a.speed === b.speed && a.forward === b.forward && a.steps === b.steps;

// Coalesces drive commands:
// - only the latest value per loco is sent;
// - the first change after a quiet period goes out on the next tick (0 ms),
//   so that several locos set in the same moment (a consist) share one
//   datagram; after that, at most one send per interval;
// - nothing is sent if the value equals the last known state of the loco.
export class DriveThrottle {
  private readonly pending = new Map<number, DriveRequest>();
  // Last value sent or reported by the central unit, per address.
  private readonly lastKnown = new Map<number, DriveRequest>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sendDatasets: (datasets: Uint8Array[]) => void,
    private readonly intervalMs: number = THROTTLE_INTERVAL_MS,
  ) {}

  set(request: DriveRequest): void {
    this.pending.set(request.address, request);
    this.timer ??= setTimeout(() => {
      this.tick();
    }, 0);
  }

  // Drops a pending command, e.g. because the loco was emergency-stopped.
  // The next set() for the address is always sent.
  cancel(address: number): void {
    this.pending.delete(address);
    this.lastKnown.delete(address);
  }

  cancelAll(): void {
    this.pending.clear();
    this.lastKnown.clear();
  }

  // Updates the known state from LAN_X_LOCO_INFO, so that "unchanged" is
  // judged against what the central unit actually reports.
  noteReported(loco: LocoInfo): void {
    if (loco.speedSteps === undefined) {
      this.lastKnown.delete(loco.address);
      return;
    }
    this.lastKnown.set(loco.address, {
      address: loco.address,
      steps: loco.speedSteps,
      speed: loco.speed,
      forward: loco.forward,
    });
  }

  // Forget everything, e.g. after reconnecting.
  reset(): void {
    this.cancelAll();
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    this.timer = null;
    if (this.flush() > 0) {
      // Keep the rate limit for commands that arrive within the interval.
      this.timer = setTimeout(() => {
        this.tick();
      }, this.intervalMs);
    }
  }

  private flush(): number {
    const datasets: Uint8Array[] = [];
    for (const request of this.pending.values()) {
      const known = this.lastKnown.get(request.address);
      if (known && sameDrive(known, request)) {
        continue;
      }
      datasets.push(lanXSetLocoDrive({...request, emergencyStop: false}));
      this.lastKnown.set(request.address, request);
    }
    this.pending.clear();
    if (datasets.length > 0) {
      this.sendDatasets(datasets);
    }
    return datasets.length;
  }
}
