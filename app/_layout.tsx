import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useTheme} from '../src/theme';
import {AppServicesProvider} from '../src/ui/AppServices';

// Screens draw their own header (ScreenFrame), which carries the global STOP.
const RootLayout = () => {
  const {colors} = useTheme();
  return (
    <SafeAreaProvider>
      <AppServicesProvider>
        <Stack
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
