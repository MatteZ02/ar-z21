import {StatusBar} from 'expo-status-bar';
import {StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from './src/theme';
import {ConnectionDebugScreen} from './src/ui/debug/ConnectionDebugScreen';

// Phase 1: the app only shows the developer connection test screen. Real
// navigation and screens come in Phase 2.
const App = () => {
  const {colors} = useTheme();

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, {backgroundColor: colors.background}]}
      >
        <ConnectionDebugScreen />
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
