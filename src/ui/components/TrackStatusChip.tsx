import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TrackStatus} from '../../connection';
import {useConnectionStore} from '../../store/connectionStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {Icon, IconName} from './Icon';

type ChipStatus = Exclude<TrackStatus, 'normal' | 'unknown'>;

// Track status in the header (brief §6.2), whenever the track is not in
// normal operation. It sits beside the connection indicator and is no taller
// than the STOP button, so nothing on the screen moves when it appears
// (decided by the user). One tap restores power (decided by the user); in
// programming mode it only shows the status. Changes made by other devices
// appear here too, because the status comes from the central unit.
export const TrackStatusChip = () => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const {controller} = useServices();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const trackStatus = useConnectionStore((state) => state.trackStatus);

  if (!connected || trackStatus === 'normal' || trackStatus === 'unknown') {
    return null;
  }

  const status: ChipStatus = trackStatus;
  const view: Record<
    ChipStatus,
    {icon: IconName; background: string; text: string}
  > = {
    emergencyStop: {
      icon: 'alert-octagon',
      background: colors.statusEmergencyStop,
      text: colors.textOnEmergencyStop,
    },
    powerOff: {
      icon: 'power-plug-off',
      background: colors.statusPowerOff,
      text: colors.textOnStatus,
    },
    shortCircuit: {
      icon: 'flash-alert',
      background: colors.statusShortCircuit,
      text: colors.textOnStatus,
    },
    programming: {
      icon: 'wrench',
      background: colors.statusProgramming,
      text: colors.textOnStatus,
    },
  };
  const current = view[status];
  const canRestore = status !== 'programming';

  return (
    <Pressable
      accessibilityRole={canRestore ? 'button' : 'text'}
      accessibilityLabel={strings.track[status]}
      accessibilityHint={
        canRestore
          ? status === 'emergencyStop'
            ? strings.track.resumeHint
            : strings.track.powerOnHint
          : undefined
      }
      accessibilityLiveRegion="assertive"
      disabled={!canRestore}
      onPress={() => {
        controller.setTrackPower(true);
      }}
      style={({pressed}) => [
        styles.chip,
        {
          minHeight: minTouchTarget,
          minWidth: minTouchTarget,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radii.md,
          backgroundColor: current.background,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.icons, {gap: spacing.xs}]}>
        <Icon name={current.icon} size={fontSizes.body} color={current.text} />
        {canRestore && (
          <Icon name="power" size={fontSizes.body} color={current.text} />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.label, {color: current.text, fontSize: fontSizes.small}]}
      >
        {strings.track.short[status]}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icons: {
    flexDirection: 'row',
  },
  label: {
    fontWeight: '800',
  },
});
