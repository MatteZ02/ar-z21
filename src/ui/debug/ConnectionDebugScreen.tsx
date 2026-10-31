import {useEffect, useState} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ConnectionState,
  DeviceInfo,
  ProtocolLogEntry,
  TrackStatus,
} from '../../connection';
import {
  isValidLocoAddress,
  LocoInfo,
  maxSpeedStep,
  Z21_DEFAULT_PORT,
} from '../../protocol';
import {useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';

const LOG_LIMIT = 200;
const MONOSPACE = Platform.select({ios: 'Menlo', default: 'monospace'});

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'normal' | 'stop';
};

const DebugButton = ({label, onPress, variant = 'normal'}: ButtonProps) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const stop = variant === 'stop';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          minHeight: minTouchTarget,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          backgroundColor: stop ? colors.stopButton : colors.accent,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: stop ? colors.textOnStopButton : colors.textOnAccent,
          fontSize: fontSizes.body,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// Developer tool: send basic commands on the app's connection and watch the
// hex protocol log. Reached from Settings.
export const ConnectionDebugScreen = () => {
  const {colors, spacing, fontSizes, radii} = useTheme();
  const {manager} = useServices();

  const [host, setHost] = useState(useSettingsStore.getState().host);
  const [port, setPort] = useState(String(useSettingsStore.getState().port));
  const [state, setState] = useState<ConnectionState>(manager.getState());
  const [trackStatus, setTrackStatus] = useState<TrackStatus>(
    manager.getTrackStatus(),
  );
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(
    manager.getDeviceInfo(),
  );
  const [logEnabled, setLogEnabled] = useState(true);
  const [log, setLog] = useState<ProtocolLogEntry[]>([]);

  const [addressText, setAddressText] = useState('3');
  const [watchedAddress, setWatchedAddress] = useState<number | null>(null);
  const [loco, setLoco] = useState<LocoInfo | null>(null);

  useEffect(() => {
    const unsubscribers = [
      manager.on('state', setState),
      manager.on('trackStatus', setTrackStatus),
      manager.on('deviceInfo', setDeviceInfo),
      manager.on('log', (entry) => {
        if (__DEV__) {
          console.log(`[z21 ${entry.direction}] ${entry.text}`);
        }
        setLog((previous) => [entry, ...previous].slice(0, LOG_LIMIT));
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [manager]);

  useEffect(() => {
    manager.setLogging(logEnabled);
    return () => {
      manager.setLogging(false);
    };
  }, [manager, logEnabled]);

  useEffect(() => {
    if (watchedAddress === null) {
      return;
    }
    setLoco(null);
    const unwatch = manager.watchLocos([watchedAddress]);
    const unsubscribe = manager.on('locoInfo', (info) => {
      if (info.address === watchedAddress) {
        setLoco(info);
      }
    });
    return () => {
      unwatch();
      unsubscribe();
    };
  }, [manager, watchedAddress]);

  const drive = (speed: number, forward: boolean) => {
    if (watchedAddress === null) {
      return;
    }
    const steps = loco?.speedSteps ?? 128;
    const clamped = Math.max(0, Math.min(maxSpeedStep(steps), speed));
    manager.drive({address: watchedAddress, steps, speed: clamped, forward});
  };
  const currentSpeed = loco?.speed ?? 0;
  const currentForward = loco?.forward ?? true;

  const textStyle = {color: colors.textPrimary, fontSize: fontSizes.body};
  const headingStyle = {
    color: colors.textPrimary,
    fontSize: fontSizes.large,
    marginTop: spacing.lg,
  };
  const inputStyle = [
    styles.input,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      padding: spacing.sm,
      fontSize: fontSizes.body,
    },
  ];

  const deviceText =
    deviceInfo.firmwareVersion === undefined
      ? strings.debug.deviceUnknown
      : `HW 0x${(deviceInfo.hardwareType ?? 0).toString(16)}, ` +
        `${strings.debug.firmware} ${deviceInfo.firmwareVersion}` +
        (deviceInfo.lockCode === undefined
          ? ''
          : `, ${strings.debug.lockCode} ${deviceInfo.lockCode}`);

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={textStyle}>{strings.debug.host}</Text>
      <TextInput
        style={inputStyle}
        value={host}
        onChangeText={setHost}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={{color: colors.textSecondary, fontSize: fontSizes.small}}>
        {strings.debug.hostHint}
      </Text>
      <Text style={textStyle}>{strings.debug.port}</Text>
      <TextInput
        style={inputStyle}
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <View style={[styles.row, {gap: spacing.sm}]}>
        <DebugButton
          label={strings.debug.connect}
          onPress={() => {
            manager.connect(host.trim(), Number(port) || Z21_DEFAULT_PORT);
          }}
        />
        <DebugButton
          label={strings.debug.disconnect}
          onPress={() => {
            manager.disconnect();
          }}
        />
      </View>

      <Text style={textStyle}>
        {strings.debug.connection}: {state}
      </Text>
      <Text style={textStyle}>
        {strings.debug.track}: {trackStatus}
      </Text>
      <Text style={textStyle}>
        {strings.debug.device}: {deviceText}
      </Text>

      <View style={[styles.row, {gap: spacing.sm}]}>
        <DebugButton
          label={strings.debug.requestStatus}
          onPress={() => {
            manager.requestStatus();
          }}
        />
        <DebugButton
          label={strings.debug.powerOn}
          onPress={() => {
            manager.setTrackPower(true);
          }}
        />
        <DebugButton
          label={strings.debug.powerOff}
          onPress={() => {
            manager.setTrackPower(false);
          }}
        />
        <DebugButton
          label={strings.debug.stop}
          variant="stop"
          onPress={() => {
            manager.emergencyStop();
          }}
        />
      </View>

      <Text style={headingStyle}>{strings.debug.loco}</Text>
      <Text style={textStyle}>{strings.debug.locoAddress}</Text>
      <View style={[styles.row, {gap: spacing.sm}]}>
        <TextInput
          style={[inputStyle, styles.addressInput]}
          value={addressText}
          onChangeText={setAddressText}
          keyboardType="number-pad"
        />
        <DebugButton
          label={strings.debug.watch}
          onPress={() => {
            const address = Number(addressText);
            if (isValidLocoAddress(address)) {
              setWatchedAddress(address);
            }
          }}
        />
      </View>
      <Text style={textStyle}>
        {loco === null
          ? strings.debug.noLocoInfo
          : `#${loco.address}  ${loco.forward ? '>' : '<'} ${loco.speed}` +
            `/${loco.speedSteps ?? '?'}` +
            (loco.emergencyStop ? '  E-STOP' : '') +
            (loco.busy ? `  (${strings.debug.busy})` : '') +
            `  F: ${loco.functions
              .flatMap((on, index) => (on ? [index] : []))
              .join(',')}`}
      </Text>
      <View style={[styles.row, {gap: spacing.sm}]}>
        {[-10, -1, 1, 10].map((delta) => (
          <DebugButton
            key={delta}
            label={delta > 0 ? `+${delta}` : String(delta)}
            onPress={() => {
              drive(currentSpeed + delta, currentForward);
            }}
          />
        ))}
        <DebugButton
          label={strings.debug.reverse}
          onPress={() => {
            drive(currentSpeed, !currentForward);
          }}
        />
        <DebugButton
          label={strings.debug.light}
          onPress={() => {
            if (watchedAddress !== null) {
              manager.setFunction(
                watchedAddress,
                0,
                !(loco?.functions[0] ?? false),
              );
            }
          }}
        />
        <DebugButton
          label={strings.debug.locoStop}
          variant="stop"
          onPress={() => {
            if (watchedAddress !== null) {
              manager.emergencyStopLocos([
                {
                  address: watchedAddress,
                  steps: loco?.speedSteps ?? 128,
                  forward: currentForward,
                },
              ]);
            }
          }}
        />
      </View>

      <Text style={headingStyle}>{strings.debug.log}</Text>
      <View style={[styles.row, {gap: spacing.sm}]}>
        <Text style={textStyle}>{strings.debug.logEnabled}</Text>
        <Switch value={logEnabled} onValueChange={setLogEnabled} />
        <DebugButton
          label={strings.debug.clearLog}
          onPress={() => {
            setLog([]);
          }}
        />
      </View>
      {log.map((entry, index) => (
        <Text
          key={`${entry.time}-${index}`}
          style={{
            color:
              entry.direction === 'info'
                ? colors.textSecondary
                : colors.textPrimary,
            fontFamily: MONOSPACE,
            fontSize: fontSizes.small,
          }}
        >
          {new Date(entry.time).toLocaleTimeString()}{' '}
          {entry.direction === 'out'
            ? '>>'
            : entry.direction === 'in'
              ? '<<'
              : '--'}{' '}
          {entry.text}
        </Text>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
  },
  addressInput: {
    minWidth: 120,
  },
});
