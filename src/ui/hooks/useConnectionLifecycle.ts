import {useEffect} from 'react';
import {AppState} from 'react-native';
import {ConnectionManager} from '../../connection';

// Logs off when the app goes to the background and reconnects when it comes
// back (brief §5). "inactive" (e.g. iOS control centre) keeps the connection.
export const useConnectionLifecycle = (manager: ConnectionManager): void => {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        manager.suspend();
      } else if (state === 'active') {
        manager.resume();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [manager]);
};
