import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {ConnectionManager} from '../connection';
import {NativeUdpTransport} from '../connection/nativeUdpTransport';
import {openLibraryDatabase} from '../db/openLibraryDatabase';
import {DriveController} from '../driving/DriveController';
import {libraryDatabase, LibraryService} from '../library/LibraryService';
import {filePhotoStore} from '../library/photos';
import {
  bindConnectionStore,
  useConnectionStore,
} from '../store/connectionStore';
import {useSettingsStore} from '../store/settingsStore';
import {feedback} from './feedback';
import {useConnectionLifecycle} from './hooks/useConnectionLifecycle';
import {
  hasLocalNetworkAccess,
  requestLocalNetworkAccess,
} from './localNetworkPermission';

export type AppServices = {
  manager: ConnectionManager;
  controller: DriveController;
  library: LibraryService;
};

const ServicesContext = createContext<AppServices | null>(null);

const createServices = (): AppServices => {
  const manager = new ConnectionManager({
    createTransport: () => new NativeUdpTransport(),
  });
  const database = openLibraryDatabase().then(libraryDatabase);
  return {
    manager,
    controller: new DriveController(manager),
    library: new LibraryService(database, filePhotoStore),
  };
};

// Owns the single connection to the central unit and the loco library for
// the whole app. Connects at start-up to the address saved in settings.
export const AppServicesProvider = ({children}: {children: ReactNode}) => {
  const [services] = useState(createServices);

  useEffect(() => {
    services.library.load().catch(() => undefined);
  }, [services]);

  useEffect(() => {
    const {manager, controller} = services;
    const unbind = bindConnectionStore(manager);
    controller.start();
    let active = true;
    // Ask for local network access first (Android 17+), then connect. The
    // connection is started either way: if access is refused, the banner
    // explains why nothing arrives.
    requestLocalNetworkAccess()
      .then((access) => {
        useConnectionStore.setState({localNetworkDenied: access === 'denied'});
        const {host, port} = useSettingsStore.getState();
        if (active && host !== '') {
          manager.connect(host, port);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unbind();
      controller.stop();
      manager.disconnect();
    };
  }, [services]);

  useConnectionLifecycle(services.manager);

  // Back from the system settings with access now allowed: connect again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (
        state !== 'active' ||
        !useConnectionStore.getState().localNetworkDenied
      ) {
        return;
      }
      hasLocalNetworkAccess()
        .then((granted) => {
          if (granted) {
            useConnectionStore.setState({localNetworkDenied: false});
            const {host, port} = useSettingsStore.getState();
            services.manager.connect(host, port);
          }
        })
        .catch(() => undefined);
    });
    return () => {
      subscription.remove();
    };
  }, [services]);

  // A short circuit must be impossible to miss (brief §6.2): vibrate as well.
  useEffect(
    () =>
      useConnectionStore.subscribe((state, previous) => {
        if (
          state.trackStatus === 'shortCircuit' &&
          previous.trackStatus !== 'shortCircuit'
        ) {
          feedback.alarm();
        }
      }),
    [],
  );

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = (): AppServices => {
  const services = useContext(ServicesContext);
  if (services === null) {
    throw new Error('useServices must be used inside AppServicesProvider');
  }
  return services;
};
