import {useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useConnectionStore} from '../../store/connectionStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';

// Shown in the header of every screen (brief §6.1). Opens the settings.
export const ConnectionIndicator = () => {
  const {colors, fontSizes, minTouchTarget, spacing} = useTheme();
  const router = useRouter();
  const state = useConnectionStore((store) => store.state);

  const view = {
    connected: {
      icon: 'lan-connect',
      color: colors.connectionOk,
      short: strings.connection.connectedShort,
      long: strings.connection.connected,
    },
    connecting: {
      icon: 'lan-pending',
      color: colors.connectionConnecting,
      short: strings.connection.connectingShort,
      long: strings.connection.connecting,
    },
    reconnecting: {
      icon: 'lan-pending',
      color: colors.connectionConnecting,
      short: strings.connection.connectingShort,
      long: strings.connection.reconnecting,
    },
    disconnected: {
      icon: 'lan-disconnect',
      color: colors.connectionError,
      short: strings.connection.disconnectedShort,
      long: strings.connection.disconnected,
    },
  } as const;
  const current = view[state];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={current.long}
      accessibilityHint={strings.settings.title}
      onPress={() => {
        router.push('/settings');
      }}
      style={[
        styles.indicator,
        {minHeight: minTouchTarget, minWidth: minTouchTarget, gap: spacing.xs},
      ]}
    >
      <Icon name={current.icon} size={fontSizes.title} color={current.color} />
      <Text style={{color: current.color, fontSize: fontSizes.small}}>
        {current.short}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
