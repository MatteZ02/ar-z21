import {PermissionsAndroid, Platform} from 'react-native';

// Android 17 (SDK 37) blocks traffic to the local network, and so to the
// central unit, until the user allows ACCESS_LOCAL_NETWORK. Older Android
// versions and iOS (which asks by itself, using NSLocalNetworkUsageDescription)
// need nothing here.
const FIRST_ENFORCED_SDK = 37;

export type LocalNetworkAccess = 'granted' | 'denied';

const isRequired = (): boolean =>
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  Platform.Version >= FIRST_ENFORCED_SDK;

// Asks for the permission if needed. Never throws.
export const requestLocalNetworkAccess =
  async (): Promise<LocalNetworkAccess> => {
    if (!isRequired()) {
      return 'granted';
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_LOCAL_NETWORK,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED
        ? 'granted'
        : 'denied';
    } catch {
      return 'denied';
    }
  };

// Checks without asking, e.g. when the app comes back from the settings.
export const hasLocalNetworkAccess = async (): Promise<boolean> => {
  if (!isRequired()) {
    return true;
  }
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_LOCAL_NETWORK,
    );
  } catch {
    return false;
  }
};
