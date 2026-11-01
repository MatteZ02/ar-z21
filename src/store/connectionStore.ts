import {create} from 'zustand';
import {
  ConnectionManager,
  ConnectionState,
  DeviceInfo,
  TrackStatus,
} from '../connection';

type ConnectionStoreState = {
  state: ConnectionState;
  trackStatus: TrackStatus;
  deviceInfo: DeviceInfo;
  // Android 17+: the user refused local network access, so the central
  // unit cannot be reached.
  localNetworkDenied: boolean;
};

export const useConnectionStore = create<ConnectionStoreState>(() => ({
  state: 'disconnected',
  trackStatus: 'unknown',
  deviceInfo: {},
  localNetworkDenied: false,
}));

// Mirrors the manager's state into the store. Returns an unbind function.
export const bindConnectionStore = (
  manager: Pick<
    ConnectionManager,
    'on' | 'getState' | 'getTrackStatus' | 'getDeviceInfo'
  >,
): (() => void) => {
  useConnectionStore.setState({
    state: manager.getState(),
    trackStatus: manager.getTrackStatus(),
    deviceInfo: manager.getDeviceInfo(),
  });
  const unsubscribers = [
    manager.on('state', (state) => {
      useConnectionStore.setState({state});
    }),
    manager.on('trackStatus', (trackStatus) => {
      useConnectionStore.setState({trackStatus});
    }),
    manager.on('deviceInfo', (deviceInfo) => {
      useConnectionStore.setState({deviceInfo});
    }),
  ];
  return () => {
    unsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
  };
};
