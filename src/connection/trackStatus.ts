import {CentralState, Z21Message} from '../protocol';

export type TrackStatus =
  | 'unknown'
  | 'normal'
  | 'emergencyStop'
  | 'powerOff'
  | 'shortCircuit'
  | 'programming';

// Several bits can be set at once; the most severe one wins.
export const trackStatusFromCentralState = (
  state: CentralState,
): TrackStatus => {
  if (state.shortCircuit) {
    return 'shortCircuit';
  }
  if (state.trackVoltageOff) {
    return 'powerOff';
  }
  if (state.emergencyStop) {
    return 'emergencyStop';
  }
  if (state.programmingMode) {
    return 'programming';
  }
  return 'normal';
};

// Track status after a message, given the current one; undefined if the
// message says nothing about it.
//
// A z21 start (FW 1.33) reports a short circuit as BC_TRACK_SHORT_CIRCUIT
// immediately followed by BC_TRACK_POWER_OFF, while its status bits still say
// "short circuit + power off". The power-off broadcast must not hide the short
// circuit: it lasts until power is switched on again, or a full status report
// no longer has the short-circuit bit.
export const nextTrackStatus = (
  current: TrackStatus,
  message: Z21Message,
): TrackStatus | undefined => {
  const status = trackStatusFromMessage(message);
  if (current === 'shortCircuit' && message.type === 'trackPowerOff') {
    return 'shortCircuit';
  }
  return status;
};

// Track status implied by a message on its own, or undefined if the message
// says nothing about it.
export const trackStatusFromMessage = (
  message: Z21Message,
): TrackStatus | undefined => {
  switch (message.type) {
    case 'status':
      return trackStatusFromCentralState(message.centralState);
    case 'systemState':
      return trackStatusFromCentralState(message.systemState.centralState);
    case 'trackPowerOn':
      return 'normal';
    case 'trackPowerOff':
      return 'powerOff';
    case 'stopped':
      return 'emergencyStop';
    case 'shortCircuit':
      return 'shortCircuit';
    case 'programmingMode':
      return 'programming';
    default:
      return undefined;
  }
};
