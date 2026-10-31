import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {ConnectionManager} from '../connection';
import {NativeUdpTransport} from '../connection/nativeUdpTransport';
import {LocoRepository} from '../db/locoRepository';
import {openLibraryDatabase} from '../db/openLibraryDatabase';
import {DriveController} from '../driving/DriveController';
import {LibraryService} from '../library/LibraryService';
import {filePhotoStore} from '../library/photos';
import {
  bindConnectionStore,
  useConnectionStore,
} from '../store/connectionStore';
import {useSettingsStore} from '../store/settingsStore';
import {feedback} from './feedback';
import {useConnectionLifecycle} from './hooks/useConnectionLifecycle';

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
  const repository = openLibraryDatabase().then((db) => new LocoRepository(db));
  return {
    manager,
    controller: new DriveController(manager),
    library: new LibraryService(repository, filePhotoStore),
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
    const {host, port} = useSettingsStore.getState();
    if (host !== '') {
      manager.connect(host, port);
    }
    return () => {
      unbind();
      controller.stop();
      manager.disconnect();
    };
  }, [services]);

  useConnectionLifecycle(services.manager);

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
