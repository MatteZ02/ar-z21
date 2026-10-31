import {ConnectionManager} from '../connection';
import {
  DEFAULT_SPEED_STEPS,
  LocoInfo,
  maxSpeedStep,
  SpeedSteps,
} from '../protocol';
import {LiveLoco, useLocoStore} from '../store/locoStore';
import {GlobalStopTapper, StopAction, StopMode} from './globalStop';
import {
  applyChange,
  displayedLoco,
  emptyIntent,
  LOCAL_CHANGE_HOLD_MS,
  LocoChange,
  LocoIntent,
  reconcileIntent,
} from './locoIntent';
import {SharedControlDetector} from './sharedControl';

// The parts of ConnectionManager that driving needs; tests pass a fake.
export type DriveConnection = Pick<
  ConnectionManager,
  | 'on'
  | 'drive'
  | 'setFunction'
  | 'emergencyStop'
  | 'emergencyStopLocos'
  | 'setTrackPower'
  | 'watchLocos'
>;

type WatchedLoco = {
  watchers: number;
  steps: SpeedSteps;
  report: LocoInfo | null;
  intent: LocoIntent;
  // Ends the hold of pending changes even if no report arrives.
  intentTimer: ReturnType<typeof setTimeout> | null;
  sharedTimer: ReturnType<typeof setTimeout> | null;
  unwatch: () => void;
};

// Everything a throttle does goes through here. Keeps the live state of the
// locos on screen in useLocoStore: the central unit's reports, overlaid with
// the user's not yet confirmed changes, plus the shared-control flag.
export class DriveController {
  private readonly locos = new Map<number, WatchedLoco>();
  private readonly shared = new SharedControlDetector();
  private readonly stopTapper: GlobalStopTapper;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly connection: DriveConnection,
    private readonly now: () => number = Date.now,
  ) {
    this.stopTapper = new GlobalStopTapper(now);
  }

  start(): void {
    this.unsubscribe ??= this.connection.on('locoInfo', (report) => {
      this.handleReport(report);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const address of [...this.locos.keys()]) {
      this.release(address);
    }
  }

  // Shows a loco on screen: subscribes to its live info. Returns a function
  // that ends this watch. `steps` is the loco's configured speed-step mode.
  watch(address: number, steps: SpeedSteps = DEFAULT_SPEED_STEPS): () => void {
    let loco = this.locos.get(address);
    if (loco === undefined) {
      loco = {
        watchers: 0,
        steps,
        report: null,
        intent: emptyIntent(),
        intentTimer: null,
        sharedTimer: null,
        unwatch: this.connection.watchLocos([address]),
      };
      this.locos.set(address, loco);
    }
    loco.watchers++;
    loco.steps = steps;
    this.publish(address);
    let active = true;
    return () => {
      if (active) {
        active = false;
        const current = this.locos.get(address);
        if (current !== undefined && --current.watchers === 0) {
          this.release(address);
        }
      }
    };
  }

  setSpeedSteps(address: number, steps: SpeedSteps): void {
    const loco = this.locos.get(address);
    if (loco !== undefined) {
      loco.steps = steps;
    }
  }

  setSpeed(address: number, speed: number): void {
    const loco = this.locos.get(address);
    if (loco === undefined) {
      return;
    }
    const clamped = Math.max(
      0,
      Math.min(maxSpeedStep(loco.steps), Math.round(speed)),
    );
    const {forward} = displayedLoco(loco.report, loco.intent);
    this.sendDrive(
      address,
      loco,
      {kind: 'speed', speed: clamped},
      clamped,
      forward,
    );
  }

  setDirection(address: number, forward: boolean): void {
    const loco = this.locos.get(address);
    if (loco === undefined) {
      return;
    }
    const shown = displayedLoco(loco.report, loco.intent);
    const speed = shown.emergencyStop ? 0 : shown.speed;
    this.sendDrive(address, loco, {kind: 'direction', forward}, speed, forward);
  }

  // Normal stop: speed 0, the decoder brakes with its configured momentum.
  stopLoco(address: number): void {
    this.setSpeed(address, 0);
  }

  // Immediate stop of one loco, ignoring momentum.
  emergencyStopLoco(address: number): void {
    this.emergencyStopLocos([address]);
  }

  // Immediate stop of several locos (all members of a consist) in one
  // datagram, ignoring speed differences (brief §6.7).
  emergencyStopLocos(addresses: number[]): void {
    const targets = addresses.flatMap((address) => {
      const loco = this.locos.get(address);
      if (loco === undefined) {
        return [];
      }
      const {forward} = displayedLoco(loco.report, loco.intent);
      this.change(address, loco, {kind: 'emergencyStop'});
      return [{address, steps: loco.steps, forward}];
    });
    if (targets.length > 0) {
      this.connection.emergencyStopLocos(targets);
    }
  }

  // Sets speed and direction of several locos at once (a consist). The drive
  // throttle sends them in the same datagram.
  driveLocos(drives: {address: number; speed: number; forward: boolean}[]) {
    for (const {address, speed, forward} of drives) {
      const loco = this.locos.get(address);
      if (loco === undefined) {
        continue;
      }
      const clamped = Math.max(
        0,
        Math.min(maxSpeedStep(loco.steps), Math.round(speed)),
      );
      loco.intent = applyChange(
        loco.intent,
        {kind: 'direction', forward},
        this.now(),
      );
      this.sendDrive(
        address,
        loco,
        {kind: 'speed', speed: clamped},
        clamped,
        forward,
      );
    }
  }

  setFunction(address: number, index: number, on: boolean): void {
    const loco = this.locos.get(address);
    if (loco === undefined) {
      return;
    }
    this.shared.noteFunction(address, index, on, this.now());
    this.change(address, loco, {kind: 'function', index, on});
    this.connection.setFunction(address, index, on);
  }

  // A tap on the global STOP control. Acts immediately and returns what was
  // done, so the UI can give matching feedback.
  globalStop(mode: StopMode): StopAction {
    const action = this.stopTapper.tap(mode);
    // Loco displays are not changed here: the track status banner shows the
    // stop, and the connection asks for the locos' state afterwards, so the
    // screen shows what the central unit actually holds.
    if (action === 'emergencyStop') {
      this.connection.emergencyStop();
    } else {
      this.connection.setTrackPower(false);
    }
    return action;
  }

  setTrackPower(on: boolean): void {
    this.connection.setTrackPower(on);
  }

  private sendDrive(
    address: number,
    loco: WatchedLoco,
    change: LocoChange,
    speed: number,
    forward: boolean,
  ): void {
    this.shared.noteDrive(address, speed, forward, this.now());
    this.change(address, loco, change);
    this.connection.drive({address, steps: loco.steps, speed, forward});
  }

  private change(address: number, loco: WatchedLoco, change: LocoChange) {
    loco.intent = applyChange(loco.intent, change, this.now());
    // After the hold time the central unit's last report is shown again,
    // whether or not a new report has arrived: a change the central unit
    // ignored must not stay on screen.
    if (loco.intentTimer !== null) {
      clearTimeout(loco.intentTimer);
    }
    loco.intentTimer = setTimeout(() => {
      loco.intentTimer = null;
      loco.intent =
        loco.report === null
          ? emptyIntent()
          : reconcileIntent(loco.intent, loco.report, this.now());
      this.publish(address);
    }, LOCAL_CHANGE_HOLD_MS);
    this.publish(address);
  }

  private handleReport(report: LocoInfo): void {
    const loco = this.locos.get(report.address);
    if (loco === undefined) {
      return;
    }
    const now = this.now();
    loco.report = report;
    loco.intent = reconcileIntent(loco.intent, report, now);
    this.shared.noteReport(report, now);
    this.scheduleSharedExpiry(report.address, loco, now);
    this.publish(report.address);
  }

  // The shared-control flag switches off by time, not by a report, so
  // re-publish when it expires.
  private scheduleSharedExpiry(
    address: number,
    loco: WatchedLoco,
    now: number,
  ) {
    if (loco.sharedTimer !== null) {
      clearTimeout(loco.sharedTimer);
      loco.sharedTimer = null;
    }
    const until = this.shared.sharedUntil(address);
    if (until !== undefined && until > now) {
      loco.sharedTimer = setTimeout(() => {
        loco.sharedTimer = null;
        this.publish(address);
      }, until - now);
    }
  }

  private publish(address: number): void {
    const loco = this.locos.get(address);
    if (loco === undefined) {
      return;
    }
    const live: LiveLoco = {
      ...displayedLoco(loco.report, loco.intent),
      shared: this.shared.isShared(address, this.now()),
    };
    // Until the central unit reports the mode, show the configured one.
    live.speedSteps ??= loco.steps;
    useLocoStore.setState((state) => ({
      locos: {...state.locos, [address]: live},
    }));
  }

  private release(address: number): void {
    const loco = this.locos.get(address);
    if (loco === undefined) {
      return;
    }
    if (loco.sharedTimer !== null) {
      clearTimeout(loco.sharedTimer);
    }
    if (loco.intentTimer !== null) {
      clearTimeout(loco.intentTimer);
    }
    loco.unwatch();
    this.locos.delete(address);
    this.shared.forget(address);
    useLocoStore.setState((state) => {
      const locos = {...state.locos};
      delete locos[address];
      return {locos};
    });
  }
}
