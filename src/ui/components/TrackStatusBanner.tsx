import {StyleSheet, Text, View} from 'react-native';
import {TrackStatus} from '../../connection';
import {LockCode} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from './AppButton';
import {Icon, IconName} from './Icon';

type BannerStatus = Exclude<TrackStatus, 'normal' | 'unknown'>;

// Shown below the header whenever the track is not in normal operation
// (brief §6.2). Changes made by other devices appear here too, because the
// status comes from the central unit's broadcasts.
export const TrackStatusBanner = () => {
  const {colors, spacing, fontSizes} = useTheme();
  const {controller} = useServices();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const trackStatus = useConnectionStore((state) => state.trackStatus);
  const locked = useConnectionStore(
    (state) => state.deviceInfo.lockCode === LockCode.START_LOCKED,
  );

  if (!connected) {
    return null;
  }

  const banners = [];

  if (trackStatus !== 'normal' && trackStatus !== 'unknown') {
    const status: BannerStatus = trackStatus;
    const view: Record<
      BannerStatus,
      {icon: IconName; background: string; text: string; label: string}
    > = {
      emergencyStop: {
        icon: 'alert-octagon',
        background: colors.statusEmergencyStop,
        text: colors.textOnEmergencyStop,
        label: strings.track.emergencyStop,
      },
      powerOff: {
        icon: 'power-plug-off',
        background: colors.statusPowerOff,
        text: colors.textOnStatus,
        label: strings.track.powerOff,
      },
      shortCircuit: {
        icon: 'flash-alert',
        background: colors.statusShortCircuit,
        text: colors.textOnStatus,
        label: strings.track.shortCircuit,
      },
      programming: {
        icon: 'wrench',
        background: colors.statusProgramming,
        text: colors.textOnStatus,
        label: strings.track.programming,
      },
    };
    const current = view[status];
    const short = status === 'shortCircuit';
    banners.push(
      <View
        key="track"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[
          styles.banner,
          {
            backgroundColor: current.background,
            padding: short ? spacing.lg : spacing.md,
            gap: spacing.md,
          },
        ]}
      >
        <Icon
          name={current.icon}
          size={short ? fontSizes.display * 1.5 : fontSizes.display}
          color={current.text}
        />
        <Text
          style={[
            styles.text,
            {
              color: current.text,
              fontSize: short ? fontSizes.title : fontSizes.large,
            },
          ]}
        >
          {current.label}
        </Text>
        {status !== 'programming' && (
          // Restoring power is a separate, explicit control (brief §6.2).
          <AppButton
            label={
              status === 'emergencyStop'
                ? strings.track.resume
                : strings.track.powerOn
            }
            icon="power"
            onPress={() => {
              controller.setTrackPower(true);
            }}
          />
        )}
      </View>,
    );
  }

  if (locked) {
    banners.push(
      <View
        key="locked"
        style={[
          styles.banner,
          {
            backgroundColor: colors.statusPowerOff,
            padding: spacing.md,
            gap: spacing.md,
          },
        ]}
      >
        <Icon
          name="lock"
          size={fontSizes.display}
          color={colors.textOnStatus}
        />
        <Text
          style={[
            styles.text,
            {color: colors.textOnStatus, fontSize: fontSizes.body},
          ]}
        >
          {strings.connection.locked}
        </Text>
      </View>,
    );
  }

  return banners.length > 0 ? <View>{banners}</View> : null;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    minWidth: 160,
    fontWeight: '700',
  },
});
