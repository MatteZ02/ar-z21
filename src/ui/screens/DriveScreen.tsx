import {useKeepAwake} from 'expo-keep-awake';
import {useRouter} from 'expo-router';
import {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {defaultFunctions} from '../../library/functionSlots';
import {shownSpeed} from '../../library/speedDisplay';
import {maxSpeedStep} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {useLibraryStore} from '../../store/libraryStore';
import {useLiveLoco} from '../../store/locoStore';
import {chooseLocoToDrive, useSettingsStore} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {DirectionControl} from '../components/DirectionControl';
import {FunctionGrid} from '../components/FunctionGrid';
import {Icon} from '../components/Icon';
import {LocoPhoto} from '../components/LocoPhoto';
import {RecentLocoStrip} from '../components/RecentLocoStrip';
import {ScreenFrame} from '../components/ScreenFrame';
import {SpeedSlider} from '../components/SpeedSlider';
import {feedback} from '../feedback';

// A plain address (not in the library) gets F0..F28, three pages.
const ADDRESS_ONLY_FUNCTIONS = defaultFunctions(29);

// Single throttle, laid out like the Roco Z21 app's driving screen:
// functions on the left; speed, slider, direction around the loco's photo
// and the loco's STOP on the right; recently driven locos at the bottom.
export const DriveScreen = () => {
  useKeepAwake();
  const {colors, spacing, fontSizes, minTouchTarget, radii} = useTheme();
  const router = useRouter();
  const {controller} = useServices();
  const driveLocoId = useSettingsStore((state) => state.driveLocoId);
  const plainAddress = useSettingsStore((state) => state.locoAddress);
  const plainSteps = useSettingsStore((state) => state.locoSpeedSteps);
  const recentIds = useSettingsStore((state) => state.recentLocoIds);
  const locos = useLibraryStore((state) => state.locos);
  const connected = useConnectionStore((state) => state.state === 'connected');
  const {width, height} = useWindowDimensions();
  const landscape = width > height;

  // The library loco, if one is chosen and still exists.
  const libraryLoco = locos.find((loco) => loco.id === driveLocoId);
  const address = libraryLoco?.address ?? plainAddress;
  const configuredSteps = libraryLoco?.speedSteps ?? plainSteps;
  const functions = libraryLoco?.functions ?? ADDRESS_ONLY_FUNCTIONS;
  const live = useLiveLoco(address);

  const recentLocos = useMemo(
    () =>
      recentIds
        .map((id) => locos.find((loco) => loco.id === id))
        .filter((loco) => loco !== undefined),
    [recentIds, locos],
  );

  // Subscribe per address only: changing the speed steps of the same loco
  // must not re-subscribe, so they are read from a ref, not depended on.
  const stepsRef = useRef(configuredSteps);
  stepsRef.current = configuredSteps;
  useEffect(
    () => controller.watch(address, stepsRef.current),
    [controller, address],
  );
  useEffect(() => {
    controller.setSpeedSteps(address, configuredSteps);
  }, [controller, address, configuredSteps]);

  const steps = live?.speedSteps ?? configuredSteps;
  const max = maxSpeedStep(steps);
  const speed = live?.speed ?? 0;
  const forward = live?.forward ?? true;
  const disabled = !connected;

  const speedText = (() => {
    if (live?.emergencyStop) {
      return strings.drive.emergencyStopped;
    }
    if (libraryLoco === undefined || libraryLoco.speedDisplay === 'step') {
      return `${strings.drive.speedStep} ${speed} ${strings.drive.of} ${max}`;
    }
    const shown = shownSpeed(
      speed,
      steps,
      libraryLoco.maxSpeed,
      libraryLoco.speedDisplay,
    );
    return `${shown.value} ${
      strings.drive.speedUnits[shown.unit === 'mph' ? 'mph' : 'kmh']
    }`;
  })();

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
            // A new page set for each loco.
            key={libraryLoco?.id ?? `address-${address}`}
            functions={functions}
            active={live?.functions ?? []}
            disabled={disabled}
            onChange={(number, on) => {
              feedback.tap();
              controller.setFunction(address, number, on);
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
              {speedText}
            </Text>
            {live?.shared && (
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
              <LocoPhoto
                photo={libraryLoco?.photo ?? null}
                address={address}
                style={styles.photo}
              />
            </DirectionControl>
            <Text
              numberOfLines={2}
              style={[
                styles.locoName,
                {color: colors.textPrimary, fontSize: fontSizes.body},
              ]}
            >
              {libraryLoco === undefined
                ? strings.drive.addressOnly(address)
                : `${strings.drive.addressPrefix}${address} – ${libraryLoco.name}`}
              {'  '}
              <Text style={{color: colors.textSecondary}}>
                {forward ? strings.drive.forward : strings.drive.reverse}
              </Text>
            </Text>

            {live?.known === false && connected && (
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

      <RecentLocoStrip
        locos={recentLocos}
        currentId={libraryLoco?.id ?? null}
        onPick={(loco) => {
          chooseLocoToDrive(loco.id);
        }}
        onOpenLibrary={() => {
          router.push({pathname: '/library', params: {mode: 'pick'}});
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
  photo: {
    width: '100%',
  },
  locoName: {
    textAlign: 'center',
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
});
