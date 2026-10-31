import {Pressable, StyleSheet, Text} from 'react-native';
import {useConnectionStore} from '../../store/connectionStore';
import {useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {feedback} from '../feedback';

// The global STOP (brief §6.2). Sends on touch-down, not on release, so it
// reacts as fast as possible. Never asks for confirmation.
export const GlobalStopButton = () => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const {controller} = useServices();
  const stopMode = useSettingsStore((state) => state.stopMode);
  const connected = useConnectionStore((state) => state.state === 'connected');

  const onPressIn = () => {
    const action = controller.globalStop(stopMode);
    if (action === 'powerOff') {
      feedback.alarm();
    } else {
      feedback.emergencyStop();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.stop.label}
      accessibilityHint={
        connected
          ? strings.stop.accessibilityHint[stopMode]
          : strings.stop.notConnected
      }
      onPressIn={onPressIn}
      style={({pressed}) => [
        styles.button,
        {
          minHeight: minTouchTarget,
          minWidth: minTouchTarget * 1.75,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.stopButton,
          // Dimmed while offline: a STOP that cannot reach the layout must
          // not look like it works.
          opacity: !connected ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {color: colors.textOnStopButton, fontSize: fontSizes.large},
        ]}
      >
        {strings.stop.label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1,
  },
});
