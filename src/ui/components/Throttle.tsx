import {useRouter} from 'expo-router';
import {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {defaultFunctions} from '../../library/functionSlots';
import {shownSpeed} from '../../library/speedDisplay';
import {Loco} from '../../library/types';
import {maxSpeedStep, SpeedSteps} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {useLibraryStore} from '../../store/libraryStore';
import {useLiveLoco} from '../../store/locoStore';
import {
  chooseLocoToDrive,
  useSettingsStore,
  useThrottleSelection,
} from '../../store/settingsStore';
import {ThrottleIndex} from '../../store/throttleSelection';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {feedback} from '../feedback';
import {AppButton} from './AppButton';
import {DirectionControl} from './DirectionControl';
import {FunctionGrid} from './FunctionGrid';
import {Icon} from './Icon';
import {LocoPhoto} from './LocoPhoto';
import {RecentLocoStrip} from './RecentLocoStrip';
import {SpeedSlider} from './SpeedSlider';

// A plain address (not in the library) gets F0..F28, three pages.
const ADDRESS_ONLY_FUNCTIONS = defaultFunctions(29);

type Props = {
  index: ThrottleIndex;
};

// One complete throttle, laid out like the Roco Z21 app: functions on the
// left; speed, slider, direction around the loco's photo and the loco's STOP
// on the right; recently driven locos at the bottom. Used once on phones and
// twice side by side on wide screens.
export const Throttle = ({index}: Props) => {
  const {colors, spacing, fontSizes} = useTheme();
  const router = useRouter();
  const selection = useThrottleSelection(index);
  const locos = useLibraryStore((state) => state.locos);
  const recentIds = useSettingsStore((state) => state.recentLocoIds);

  const libraryLoco =
    selection.kind === 'library'
      ? locos.find((loco) => loco.id === selection.locoId)
      : undefined;
  const address =
    libraryLoco?.address ??
    (selection.kind === 'address' ? selection.address : null);
  const speedSteps =
    libraryLoco?.speedSteps ??
    (selection.kind === 'address' ? selection.speedSteps : 128);

  const recentLocos = useMemo(
    () =>
      recentIds
        .map((id) => locos.find((loco) => loco.id === id))
        .filter((loco) => loco !== undefined),
    [recentIds, locos],
  );

  const openLibrary = () => {
    router.push({
      pathname: '/library',
      params: {mode: 'pick', throttle: String(index)},
    });
  };

  return (
    <View style={styles.throttle}>
      {address === null ? (
        <View style={[styles.empty, {padding: spacing.lg, gap: spacing.md}]}>
          <Icon
            name="train-variant"
            size={fontSizes.display * 2}
            color={colors.textSecondary}
          />
          <Text
            style={[
              styles.emptyText,
              {color: colors.textSecondary, fontSize: fontSizes.large},
            ]}
          >
            {strings.drive.noLoco}
          </Text>
          <AppButton
            label={strings.drive.chooseLoco}
            icon="view-grid"
            onPress={openLibrary}
          />
        </View>
      ) : (
        <ThrottleControls
          address={address}
          speedSteps={speedSteps}
          libraryLoco={libraryLoco}
        />
      )}
      <RecentLocoStrip
        locos={recentLocos}
        currentId={libraryLoco?.id ?? null}
        onPick={(loco) => {
          chooseLocoToDrive(index, loco.id);
        }}
        onOpenLibrary={openLibrary}
      />
    </View>
  );
};

type ControlsProps = {
  address: number;
  speedSteps: SpeedSteps;
  libraryLoco: Loco | undefined;
};

const ThrottleControls = ({
  address,
  speedSteps: configuredSteps,
  libraryLoco,
}: ControlsProps) => {
  const {colors, spacing, fontSizes, minTouchTarget, radii} = useTheme();
  const {controller} = useServices();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const live = useLiveLoco(address);
  // Wider than tall: the slider gets the full height, controls beside it.
  const [sideBySide, setSideBySide] = useState(false);
  const functions = libraryLoco?.functions ?? ADDRESS_ONLY_FUNCTIONS;

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
        onLayout={(event) => {
          const {width, height} = event.nativeEvent.layout;
          setSideBySide(width > height);
        }}
        style={[
          styles.controls,
          {
            padding: spacing.sm,
            gap: spacing.sm,
            flexDirection: sideBySide ? 'row' : 'column',
          },
        ]}
      >
        {sideBySide && (
          <View style={{width: minTouchTarget * 2}}>{slider}</View>
        )}
        <View
          style={[
            sideBySide ? styles.sideControls : styles.flex,
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

          {!sideBySide && slider}

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
  );
};

const styles = StyleSheet.create({
  throttle: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  functions: {
    flex: 1,
  },
  controls: {
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
