import {StatusBar} from 'expo-status-bar';
import {StyleSheet, Text} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {strings} from './src/strings';
import {useTheme} from './src/theme';

const App = () => {
  const {colors, fontSizes} = useTheme();

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, {backgroundColor: colors.background}]}
      >
        <Text style={{color: colors.textPrimary, fontSize: fontSizes.title}}>
          {strings.appName}
        </Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
