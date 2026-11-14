import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TrackStatus} from '../../connection';
import {useConnectionStore} from '../../store/connectionStore';
import {useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {feedback} from '../feedback';
import {Icon, IconName} from './Icon';

type ChipStatus = Exclude<TrackStatus, 'normal' | 'unknown'>;

// Statuses a tap can end; these take STOP's place in the header.
const RESTORABLE: TrackStatus[] = ['emergencyStop', 'powerOff', 'shortCircuit'];

// The track status that replaces STOP, if any.
export const useStatusInStopPlace = (): boolean => {
  const connected = useConnectionStore((state) => state.state === 'connected');
  const trackStatus = useConnectionStore((state) => state.trackStatus);
  return connected && RESTORABLE.includes(trackStatus);
};

type Props = {
  // 'stop': in STOP's place, for the statuses a tap can end (decided by the
  // user). 'side': beside the connection indicator, for programming mode.
  place: 'stop' | 'side';
};

// Track status in the header (brief §6.2), whenever the track is not in
// normal operation. No taller than the STOP button, so nothing on the screen
// moves when it appears (decided by the user). One tap restores power
// (decided by the user), except right after a STOP tap (see
// STOP_RESTORE_GUARD_MS); in programming mode it only shows the status.
// Changes made by other devices appear here too, because the status comes
// from the central unit.
export const TrackStatusChip = ({place}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const {controller} = useServices();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const trackStatus = useConnectionStore((state) => state.trackStatus);
  const stopMode = useSettingsStore((state) => state.stopMode);

  if (
    !connected ||
    trackStatus === 'normal' ||
    trackStatus === 'unknown' ||
    RESTORABLE.includes(trackStatus) !== (place === 'stop')
  ) {
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
      // On touch-down, like STOP, so a double tap is timed the same way
      // whichever of the two the second tap lands on.
      onPressIn={() => {
        const action = controller.restoreOrStop(stopMode);
        if (action === 'powerOff') {
          feedback.alarm();
        } else if (action === 'emergencyStop') {
          feedback.emergencyStop();
        }
      }}
      style={({pressed}) => [
        styles.chip,
        {
          minHeight: minTouchTarget,
          // As wide as STOP when in its place, so the header does not shift.
          minWidth: minTouchTarget * (place === 'stop' ? 1.75 : 1),
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
