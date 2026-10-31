import {LocoInfo} from '../protocol';

// Once another controller has changed a loco, the shared-control flag stays
// on for this long after the last such change.
export const SHARED_CONTROL_HOLD_MS = 30000;
// A reported change matching a command this device sent within this time is
// treated as caused by this device.
export const OWN_COMMAND_WINDOW_MS = 3000;

type SentCommand =
  | {kind: 'drive'; speed: number; forward: boolean; at: number}
  | {kind: 'function'; index: number; on: boolean; at: number};

type LocoRecord = {
  previous: LocoInfo | null;
  sent: SentCommand[];
  sharedUntil: number;
  busy: boolean;
};

// Detects whether another controller is also driving a loco (brief §6.3):
// - the busy bit, which the central unit sets only for X-BUS handsets;
// - otherwise, a reported change that no recent command from this device
//   explains.
// Changes into emergency stop never count: a STOP from any device stops every
// loco, which is not someone else driving this one.
export class SharedControlDetector {
  private readonly records = new Map<number, LocoRecord>();

  noteDrive(address: number, speed: number, forward: boolean, now: number) {
    this.record(address, now).sent.push({
      kind: 'drive',
      speed,
      forward,
      at: now,
    });
  }

  noteFunction(address: number, index: number, on: boolean, now: number) {
    this.record(address, now).sent.push({kind: 'function', index, on, at: now});
  }

  // Returns true if the shared-control state of the loco changed.
  noteReport(report: LocoInfo, now: number): boolean {
    const record = this.record(report.address, now);
    const wasShared = this.isShared(report.address, now);
    const previous = record.previous;
    record.previous = report;
    record.busy = report.busy;
    if (previous !== null && this.hasForeignChange(previous, report, record)) {
      record.sharedUntil = now + SHARED_CONTROL_HOLD_MS;
    }
    return this.isShared(report.address, now) !== wasShared;
  }

  isShared(address: number, now: number): boolean {
    const record = this.records.get(address);
    return record !== undefined && (record.busy || now < record.sharedUntil);
  }

  // When the flag will switch off by itself, or undefined if it will not
  // (off already, or held by the busy bit).
  sharedUntil(address: number): number | undefined {
    const record = this.records.get(address);
    return record === undefined || record.busy ? undefined : record.sharedUntil;
  }

  // Forget a loco, e.g. when it is no longer shown.
  forget(address: number): void {
    this.records.delete(address);
  }

  private record(address: number, now: number): LocoRecord {
    let record = this.records.get(address);
    if (record === undefined) {
      record = {previous: null, sent: [], sharedUntil: 0, busy: false};
      this.records.set(address, record);
    }
    record.sent = record.sent.filter(
      (command) => now - command.at <= OWN_COMMAND_WINDOW_MS,
    );
    return record;
  }

  private hasForeignChange(
    previous: LocoInfo,
    next: LocoInfo,
    record: LocoRecord,
  ): boolean {
    const driveChanged =
      previous.speed !== next.speed ||
      previous.forward !== next.forward ||
      previous.emergencyStop !== next.emergencyStop;
    if (driveChanged && !next.emergencyStop) {
      const explained = record.sent.some(
        (command) =>
          command.kind === 'drive' &&
          command.speed === next.speed &&
          command.forward === next.forward,
      );
      if (!explained) {
        return true;
      }
    }
    const count = Math.max(previous.functions.length, next.functions.length);
    for (let index = 0; index < count; index++) {
      const on = next.functions[index] ?? false;
      if ((previous.functions[index] ?? false) === on) {
        continue;
      }
      const explained = record.sent.some(
        (command) =>
          command.kind === 'function' &&
          command.index === index &&
          command.on === on,
      );
      if (!explained) {
        return true;
      }
    }
    return false;
  }
}
