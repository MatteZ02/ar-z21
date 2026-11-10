import {Linking, StyleSheet, Text, View} from 'react-native';
import {LockCode} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {AppButton} from './AppButton';
import {Icon} from './Icon';

// Shown below the header for problems that prevent driving altogether: no
// local network access, or a locked z21 start. These need an explanation, so
// they are a banner. Track status (stop, power off, short circuit) is shown in
// the header instead, so the screen never moves while driving.
export const ConnectionBanner = () => {
  const {colors, spacing, fontSizes} = useTheme();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const locked = useConnectionStore(
    (state) => state.deviceInfo.lockCode === LockCode.START_LOCKED,
  );
  const localNetworkDenied = useConnectionStore(
    (state) => state.localNetworkDenied,
  );

  // Without local network access nothing can be connected: explain that
  // instead of anything else.
  if (localNetworkDenied) {
    return (
      <View
        accessibilityRole="alert"
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
          name="lan-disconnect"
          size={fontSizes.display}
          color={colors.textOnStatus}
        />
        <Text
          style={[
            styles.text,
            {color: colors.textOnStatus, fontSize: fontSizes.body},
          ]}
        >
          {strings.connection.localNetworkDenied}
        </Text>
        <AppButton
          label={strings.connection.openSettings}
          icon="cog"
          onPress={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      </View>
    );
  }

  if (!connected || !locked) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.statusPowerOff,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}
    >
      <Icon name="lock" size={fontSizes.display} color={colors.textOnStatus} />
      <Text
        style={[
          styles.text,
          {color: colors.textOnStatus, fontSize: fontSizes.body},
        ]}
      >
        {strings.connection.locked}
      </Text>
    </View>
  );
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
