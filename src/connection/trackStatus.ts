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

// Track status implied by a message, or undefined if the message says nothing
// about it.
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
