import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useSettingsStore} from '../src/store/settingsStore';
import {resolveLanguage, setLanguage, systemLocales} from '../src/strings';
import {useTheme} from '../src/theme';
import {AppServicesProvider} from '../src/ui/AppServices';

// Keep the menu underneath when the app opens directly on another screen
// (deep link, or a dev reload), so there is always a way back.
export const unstable_settings = {
  anchor: 'index',
};

// Screens draw their own header (ScreenFrame), which carries the global STOP.
const RootLayout = () => {
  const {colors} = useTheme();
  const languageSetting = useSettingsStore((state) => state.language);
  const language = resolveLanguage(languageSetting, systemLocales());
  // Before the screens render, so they read the right texts.
  setLanguage(language);
  return (
    <SafeAreaProvider>
      <AppServicesProvider>
        <Stack
          // A new language redraws every screen (and returns to the menu).
          key={language}
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: colors.background},
          }}
        />
        <StatusBar style="auto" />
      </AppServicesProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
