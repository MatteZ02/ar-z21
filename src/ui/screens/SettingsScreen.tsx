import {useRouter} from 'expo-router';
import {ReactNode, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {DeviceInfo} from '../../connection';
import {StopMode} from '../../driving/globalStop';
import {useConnectionStore} from '../../store/connectionStore';
import {useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {Icon} from '../components/Icon';
import {ScreenFrame} from '../components/ScreenFrame';

const STOP_MODES: StopMode[] = [
  'emergencyStopThenPowerOff',
  'emergencyStopOnly',
  'powerOff',
];

const describeDevice = (device: DeviceInfo): string => {
  if (
    device.hardwareType === undefined &&
    device.firmwareVersion === undefined
  ) {
    return strings.settings.deviceUnknown;
  }
  const name =
    device.hardwareType === undefined
      ? strings.hardware.unknown
      : (strings.hardware[device.hardwareType] ??
        `${strings.hardware.unknown} (0x${device.hardwareType.toString(16)})`);
  return device.firmwareVersion === undefined
    ? name
    : `${name}, ${strings.settings.firmware} ${device.firmwareVersion}`;
};

export const SettingsScreen = () => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();
  const {manager} = useServices();
  const settings = useSettingsStore();
  const connectionState = useConnectionStore((state) => state.state);
  const deviceInfo = useConnectionStore((state) => state.deviceInfo);
  const [host, setHost] = useState(settings.host);
  const [portText, setPortText] = useState(String(settings.port));

  const port = Number(portText);
  const portValid = /^\d+$/.test(portText) && port >= 1 && port <= 65535;
  const hostValid = host.trim() !== '';

  const textStyle = {color: colors.textPrimary, fontSize: fontSizes.body};
  const secondaryStyle = {
    color: colors.textSecondary,
    fontSize: fontSizes.small,
  };
  const inputStyle = [
    styles.input,
    {
      minHeight: minTouchTarget,
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      fontSize: fontSizes.body,
    },
  ];

  const section = (title: string, children: ReactNode) => (
    <View style={{gap: spacing.sm}}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.large,
          fontWeight: '700',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <ScreenFrame title={strings.settings.title}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.md, gap: spacing.xl}}
      >
        {section(
          strings.settings.connectionSection,
          <>
            <Text style={textStyle}>{strings.settings.host}</Text>
            <TextInput
              accessibilityLabel={strings.settings.host}
              style={inputStyle}
              value={host}
              onChangeText={setHost}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={textStyle}>{strings.settings.port}</Text>
            <TextInput
              accessibilityLabel={strings.settings.port}
              style={inputStyle}
              value={portText}
              onChangeText={setPortText}
              keyboardType="number-pad"
              maxLength={5}
            />
            {!portValid && (
              <Text style={secondaryStyle}>{strings.settings.invalidPort}</Text>
            )}
            <View style={[styles.row, {gap: spacing.sm}]}>
              <AppButton
                label={strings.settings.connect}
                icon="lan-connect"
                disabled={!portValid || !hostValid}
                onPress={() => {
                  const trimmed = host.trim();
                  settings.update({host: trimmed, port});
                  manager.connect(trimmed, port);
                }}
                style={styles.flex}
              />
              <AppButton
                label={strings.settings.disconnect}
                variant="outline"
                onPress={() => {
                  manager.disconnect();
                }}
                style={styles.flex}
              />
            </View>
            <Text style={textStyle}>
              {strings.settings.status}: {strings.connection[connectionState]}
            </Text>
            <Text style={textStyle}>
              {strings.settings.device}: {describeDevice(deviceInfo)}
            </Text>
          </>,
        )}

        {section(
          strings.settings.stopSection,
          <View accessibilityRole="radiogroup" style={{gap: spacing.sm}}>
            {STOP_MODES.map((mode) => {
              const selected = settings.stopMode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{selected}}
                  onPress={() => {
                    settings.update({stopMode: mode});
                  }}
                  style={[
                    styles.option,
                    {
                      minHeight: minTouchTarget,
                      gap: spacing.md,
                      padding: spacing.sm,
                      borderRadius: radii.md,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Icon
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={fontSizes.title}
                    color={selected ? colors.accent : colors.textSecondary}
                  />
                  <View style={styles.flex}>
                    <Text style={textStyle}>
                      {strings.settings.stopModes[mode].title}
                    </Text>
                    <Text style={secondaryStyle}>
                      {strings.settings.stopModes[mode].detail}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>,
        )}

        {section(
          strings.settings.developerSection,
          <AppButton
            label={strings.settings.connectionTest}
            icon="tune-variant"
            variant="outline"
            onPress={() => {
              router.push('/debug');
            }}
          />,
        )}
      </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
  },
});
