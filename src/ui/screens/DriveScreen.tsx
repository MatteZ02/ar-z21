import {useKeepAwake} from 'expo-keep-awake';
import {useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {maxSpeedStep} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {useLiveLoco} from '../../store/locoStore';
import {useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {DirectionControl} from '../components/DirectionControl';
import {FunctionGrid} from '../components/FunctionGrid';
import {Icon} from '../components/Icon';
import {LocoPicker} from '../components/LocoPicker';
import {ScreenFrame} from '../components/ScreenFrame';
import {SpeedSlider} from '../components/SpeedSlider';
import {feedback} from '../feedback';

// F0..F28. F29..F31 need firmware 1.42 and come with the library.
const FUNCTIONS = Array.from({length: 29}, (_, index) => index);

// Single throttle, laid out like the Roco Z21 app's driving screen:
// functions on the left; speed, direction, loco and loco STOP on the right.
export const DriveScreen = () => {
  useKeepAwake();
  const {colors, spacing, fontSizes, minTouchTarget, radii} = useTheme();
  const {controller} = useServices();
  const address = useSettingsStore((state) => state.locoAddress);
  const configuredSteps = useSettingsStore((state) => state.locoSpeedSteps);
  const updateSettings = useSettingsStore((state) => state.update);
  const connected = useConnectionStore((state) => state.state === 'connected');
  const loco = useLiveLoco(address);
  const [picking, setPicking] = useState(false);
  const {width, height} = useWindowDimensions();
  const landscape = width > height;

  // Subscribe per address only: changing the speed steps of the same loco
  // must not re-subscribe, so they are read here rather than depended on.
  useEffect(
    () => controller.watch(address, useSettingsStore.getState().locoSpeedSteps),
    [controller, address],
  );
  useEffect(() => {
    controller.setSpeedSteps(address, configuredSteps);
  }, [controller, address, configuredSteps]);

  const steps = loco?.speedSteps ?? configuredSteps;
  const max = maxSpeedStep(steps);
  const speed = loco?.speed ?? 0;
  const forward = loco?.forward ?? true;
  const disabled = !connected;

  const textStyle = {color: colors.textPrimary, fontSize: fontSizes.body};

  const slider = (
    <SpeedSlider
      value={speed}
      max={max}
      disabled={disabled}
      onChange={(value) => {
        controller.setSpeed(address, value);
      }}
    />
  );

  return (
    <ScreenFrame title={strings.drive.title}>
      <View style={styles.columns}>
        <View style={styles.functions}>
          <FunctionGrid
            functions={FUNCTIONS}
            active={loco?.functions ?? []}
            disabled={disabled}
            onToggle={(index, on) => {
              feedback.tap();
              controller.setFunction(address, index, on);
            }}
          />
        </View>

        <View
          style={[
            styles.throttle,
            {
              padding: spacing.sm,
              gap: spacing.sm,
              // Landscape phones are short: give the slider the full height
              // and put the other controls beside it.
              flexDirection: landscape ? 'row' : 'column',
            },
          ]}
        >
          {landscape && (
            <View style={{width: minTouchTarget * 2}}>{slider}</View>
          )}
          <View
            style={[
              landscape ? styles.sideControls : styles.flex,
              {gap: spacing.sm},
            ]}
          >
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.speed,
                {color: colors.accent, fontSize: fontSizes.title},
              ]}
            >
              {loco?.emergencyStop
                ? strings.drive.emergencyStopped
                : `${strings.drive.speedStep} ${speed} ${strings.drive.of} ${max}`}
            </Text>
            {loco?.shared && (
              <View
                accessible
                accessibilityLabel={strings.drive.sharedHint}
                style={[
                  styles.shared,
                  {
                    borderColor: colors.sharedControlFlag,
                    borderRadius: radii.round,
                    paddingHorizontal: spacing.sm,
                    gap: spacing.xs,
                  },
                ]}
              >
                <Icon
                  name="account-multiple"
                  size={fontSizes.large}
                  color={colors.sharedControlFlag}
                />
                <Text
                  style={{
                    color: colors.sharedControlFlag,
                    fontSize: fontSizes.small,
                  }}
                >
                  {strings.drive.shared}
                </Text>
              </View>
            )}

            {!landscape && slider}

            <DirectionControl
              forward={forward}
              disabled={disabled}
              onChange={(value) => {
                feedback.tap();
                controller.setDirection(address, value);
              }}
            >
              <Text style={[textStyle, styles.address]}>
                {strings.drive.addressPrefix}
                {address}
              </Text>
              <Text
                style={{color: colors.textSecondary, fontSize: fontSizes.small}}
              >
                {forward ? strings.drive.forward : strings.drive.reverse}
              </Text>
            </DirectionControl>

            {loco?.known === false && connected && (
              <Text
                style={{color: colors.textSecondary, fontSize: fontSizes.small}}
              >
                {strings.drive.waitingForLoco}
              </Text>
            )}

            <AppButton
              label={strings.drive.locoStop}
              accessibilityHint={strings.drive.locoStopHint}
              variant="outline"
              disabled={disabled}
              onPress={() => {
                feedback.emergencyStop();
                controller.emergencyStopLoco(address);
              }}
            />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${strings.drive.chooseLoco}: ${strings.drive.loco} ${address}`}
        onPress={() => {
          setPicking(true);
        }}
        style={[
          styles.picker,
          {
            minHeight: minTouchTarget,
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Icon name="train" size={fontSizes.title} color={colors.accent} />
        <Text style={[textStyle, styles.flex]}>
          {strings.drive.loco} {address} · {configuredSteps}{' '}
          {strings.drive.speedSteps.toLowerCase()}
        </Text>
        <Text style={{color: colors.accent, fontSize: fontSizes.body}}>
          {strings.drive.chooseLoco}
        </Text>
      </Pressable>

      <LocoPicker
        visible={picking}
        address={address}
        speedSteps={configuredSteps}
        onCancel={() => {
          setPicking(false);
        }}
        onChoose={(locoAddress, locoSpeedSteps) => {
          setPicking(false);
          updateSettings({locoAddress, locoSpeedSteps});
        }}
      />
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  functions: {
    flex: 1,
  },
  throttle: {
    flex: 1,
  },
  sideControls: {
    flex: 1,
    justifyContent: 'center',
  },
  speed: {
    textAlign: 'right',
  },
  shared: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderWidth: 1,
  },
  address: {
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
