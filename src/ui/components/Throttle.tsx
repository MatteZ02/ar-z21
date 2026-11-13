import {useRouter} from 'expo-router';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {
  CONSIST_MAX_SPEED,
  consistFromLead,
  memberDrive,
} from '../../consist/consistMath';
import {defaultFunctions} from '../../library/functionSlots';
import {shownSpeed} from '../../library/speedDisplay';
import {Loco, VehicleRef} from '../../library/types';
import {maxSpeedStep, SpeedSteps} from '../../protocol';
import {useConnectionStore} from '../../store/connectionStore';
import {useLibraryStore} from '../../store/libraryStore';
import {useLocoStore} from '../../store/locoStore';
import {
  chooseAddressToDrive,
  useSettingsStore,
  useThrottleSelection,
} from '../../store/settingsStore';
import {ThrottleIndex} from '../../store/throttleSelection';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {feedback} from '../feedback';
import {pickVehicle} from '../pickVehicle';
import {AppButton} from './AppButton';
import {DirectionControl} from './DirectionControl';
import {FunctionGrid} from './FunctionGrid';
import {Icon} from './Icon';
import {LocoPhoto} from './LocoPhoto';
import {LocoPicker} from './LocoPicker';
import {SpeedSlider} from './SpeedSlider';
import {StripItem, VehicleStrip} from './VehicleStrip';

// A plain address (not in the library) gets F0..F28, three pages.
const ADDRESS_ONLY_FUNCTIONS = defaultFunctions(29);

// One loco driven by the throttle: on its own, or as a consist member.
type DriveMember = {
  address: number;
  speedSteps: SpeedSteps;
  loco: Loco | undefined;
  reversed: boolean;
  speedOffset: number;
};

// What the throttle drives, resolved from the library.
type DriveTarget = {
  // Changes when the throttle is switched to something else.
  key: string;
  isConsist: boolean;
  name: string;
  photo: string | null;
  // Train order; the first is the lead loco.
  members: DriveMember[];
};

const refKey = (ref: VehicleRef) => `${ref.kind}-${ref.id}`;

type Props = {
  index: ThrottleIndex;
};

// One complete throttle, laid out like the Roco Z21 app: functions on the
// left; speed, slider, direction around the photo and STOP on the right;
// recently driven locos and consists at the bottom. Drives a loco or a
// consist. Used once on phones and twice side by side on wide screens.
export const Throttle = ({index}: Props) => {
  const {colors, spacing, fontSizes} = useTheme();
  const router = useRouter();
  const selection = useThrottleSelection(index);
  const locos = useLibraryStore((state) => state.locos);
  const consists = useLibraryStore((state) => state.consists);
  const recent = useSettingsStore((state) => state.recent);
  const vehicleBar = useSettingsStore((state) => state.vehicleBar);
  const order = useLibraryStore((state) => state.order);
  // The bottom strip: recently driven first, or the whole vehicle list.
  const barRefs = vehicleBar === 'all' ? order : recent;
  const [addressPicker, setAddressPicker] = useState(false);

  const target = useMemo((): DriveTarget | null => {
    const libraryMember = (loco: Loco): DriveMember => ({
      address: loco.address,
      speedSteps: loco.speedSteps,
      loco,
      reversed: false,
      speedOffset: 0,
    });
    switch (selection.kind) {
      case 'library': {
        const loco = locos.find((entry) => entry.id === selection.locoId);
        return loco === undefined
          ? null
          : {
              key: `loco-${loco.id}`,
              isConsist: false,
              name: `${strings.drive.addressPrefix}${loco.address} – ${loco.name}`,
              photo: loco.photo,
              members: [libraryMember(loco)],
            };
      }
      case 'consist': {
        const consist = consists.find(
          (entry) => entry.id === selection.consistId,
        );
        if (consist === undefined) {
          return null;
        }
        const members = consist.members.flatMap((member) => {
          const loco = locos.find((entry) => entry.id === member.locoId);
          return loco === undefined
            ? []
            : [
                {
                  ...libraryMember(loco),
                  reversed: member.reversed,
                  speedOffset: member.speedOffset,
                },
              ];
        });
        return {
          key: `consist-${consist.id}`,
          isConsist: true,
          name: consist.name,
          photo: consist.photo ?? members[0]?.loco?.photo ?? null,
          members,
        };
      }
      case 'address':
        return {
          key: `address-${selection.address}`,
          isConsist: false,
          name: strings.drive.addressOnly(selection.address),
          photo: null,
          members: [
            {
              address: selection.address,
              speedSteps: selection.speedSteps,
              loco: undefined,
              reversed: false,
              speedOffset: 0,
            },
          ],
        };
      case 'none':
        return null;
    }
  }, [selection, locos, consists]);

  const barItems = useMemo(
    () =>
      barRefs.flatMap((ref): StripItem[] => {
        if (ref.kind === 'loco') {
          const loco = locos.find((entry) => entry.id === ref.id);
          return loco === undefined
            ? []
            : [
                {
                  key: refKey(ref),
                  name: loco.name,
                  photo: loco.photo,
                  address: loco.address,
                },
              ];
        }
        const consist = consists.find((entry) => entry.id === ref.id);
        if (consist === undefined) {
          return [];
        }
        const lead = locos.find(
          (entry) => entry.id === consist.members[0]?.locoId,
        );
        return [
          {
            key: refKey(ref),
            name: consist.name,
            photo: consist.photo ?? lead?.photo ?? null,
            address: lead?.address,
          },
        ];
      }),
    [barRefs, locos, consists],
  );

  const openLibrary = () => {
    router.push({
      pathname: '/library',
      params: {mode: 'pick', throttle: String(index)},
    });
  };

  const empty = (text: string) => (
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
        {text}
      </Text>
      <AppButton
        label={strings.drive.chooseLoco}
        icon="view-grid"
        onPress={openLibrary}
      />
    </View>
  );

  return (
    <View style={styles.throttle}>
      {target === null ? (
        empty(strings.drive.noLoco)
      ) : target.members.length === 0 ? (
        empty(strings.drive.consistEmpty)
      ) : (
        <ThrottleControls
          key={target.key}
          target={target}
          onEditAddress={
            selection.kind === 'address'
              ? () => {
                  setAddressPicker(true);
                }
              : undefined
          }
        />
      )}
      {selection.kind === 'address' && (
        <LocoPicker
          visible={addressPicker}
          address={selection.address}
          speedSteps={selection.speedSteps}
          onCancel={() => {
            setAddressPicker(false);
          }}
          onChoose={(address, speedSteps) => {
            setAddressPicker(false);
            chooseAddressToDrive(index, address, speedSteps);
          }}
        />
      )}
      <VehicleStrip
        items={barItems}
        currentKey={target === null ? null : target.key}
        onPick={(key) => {
          const ref = barRefs.find((entry) => refKey(entry) === key);
          if (ref !== undefined) {
            pickVehicle(index, ref);
          }
        }}
        onOpenLibrary={openLibrary}
        label={
          vehicleBar === 'all'
            ? strings.drive.allVehicles
            : strings.drive.recent
        }
        itemLabel={(item, current) =>
          current
            ? `${strings.drive.current}: ${item.name}`
            : strings.drive.switchTo(item.name)
        }
      />
    </View>
  );
};

const ThrottleControls = ({
  target,
  onEditAddress,
}: {
  target: DriveTarget;
  // Set when the throttle drives a plain address that can be changed.
  onEditAddress?: () => void;
}) => {
  const {colors, spacing, fontSizes, minTouchTarget, radii} = useTheme();
  const {controller} = useServices();
  const connected = useConnectionStore((state) => state.state === 'connected');
  const {members, isConsist} = target;
  const lead = members[0];
  // Whose functions are shown: the lead, or the member picked in the strip
  // (Roco style; decided by the user).
  const [functionMember, setFunctionMember] = useState(0);
  const shownMember = members[Math.min(functionMember, members.length - 1)];
  // Wider than tall: the slider gets the full height, controls beside it.
  const [sideBySide, setSideBySide] = useState(false);

  const addresses = members.map((member) => member.address);
  const lives = useLocoStore(
    useShallow((state) => addresses.map((address) => state.locos[address])),
  );
  const leadLive = lives[0];
  const shownLive = lives[members.indexOf(shownMember)];

  // Subscribe per address only: changing the speed steps of the same loco
  // must not re-subscribe, so they are read from a ref, not depended on.
  const membersRef = useRef(members);
  membersRef.current = members;
  const addressKey = addresses.join(',');
  useEffect(() => {
    const unwatch = membersRef.current.map((member) =>
      controller.watch(member.address, member.speedSteps),
    );
    return () => {
      unwatch.forEach((stop) => {
        stop();
      });
    };
  }, [controller, addressKey]);
  useEffect(() => {
    for (const member of members) {
      controller.setSpeedSteps(member.address, member.speedSteps);
    }
  }, [controller, members]);

  // A consist runs on the 128-step scale; its speed and direction are read
  // back from the lead loco.
  const leadSpeed = leadLive?.speed ?? 0;
  const leadForward = leadLive?.forward ?? true;
  const shown = isConsist
    ? consistFromLead(leadSpeed, leadForward, lead)
    : {speed: leadSpeed, forward: leadForward};
  const steps = isConsist
    ? (128 as const)
    : (leadLive?.speedSteps ?? lead.speedSteps);
  const max = isConsist ? CONSIST_MAX_SPEED : maxSpeedStep(steps);
  const emergencyStop = leadLive?.emergencyStop ?? false;
  const disabled = !connected;

  const drive = (speed: number, forward: boolean) => {
    if (isConsist) {
      controller.driveLocos(
        members.map((member) => ({
          address: member.address,
          ...memberDrive(speed, forward, member),
        })),
      );
    } else {
      controller.driveLocos([{address: lead.address, speed, forward}]);
    }
  };

  const speedText = (() => {
    if (emergencyStop) {
      return strings.drive.emergencyStopped;
    }
    const loco = lead.loco;
    if (loco === undefined || loco.speedDisplay === 'step') {
      return `${strings.drive.speedStep} ${shown.speed} ${strings.drive.of} ${max}`;
    }
    const value = shownSpeed(
      shown.speed,
      steps,
      loco.maxSpeed,
      loco.speedDisplay,
    );
    return `${value.value} ${
      strings.drive.speedUnits[value.unit === 'mph' ? 'mph' : 'kmh']
    }`;
  })();

  const slider = (
    <SpeedSlider
      value={shown.speed}
      max={max}
      disabled={disabled}
      onChange={(value) => {
        drive(value, shown.forward);
      }}
    />
  );

  return (
    <View style={styles.flex}>
      <View style={styles.columns}>
        <View style={styles.functions}>
          <FunctionGrid
            // A new page set for each loco.
            key={shownMember.address}
            functions={shownMember.loco?.functions ?? ADDRESS_ONLY_FUNCTIONS}
            active={shownLive?.functions ?? []}
            disabled={disabled}
            onChange={(number, on) => {
              feedback.tap();
              controller.setFunction(shownMember.address, number, on);
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
            {lives.some((live) => live?.shared) && (
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
              forward={shown.forward}
              disabled={disabled}
              onChange={(forward) => {
                feedback.tap();
                drive(emergencyStop ? 0 : shown.speed, forward);
              }}
            >
              <LocoPhoto
                photo={target.photo}
                address={isConsist ? undefined : lead.address}
                style={styles.photo}
              />
            </DirectionControl>
            {onEditAddress === undefined ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.locoName,
                  {color: colors.textPrimary, fontSize: fontSizes.body},
                ]}
              >
                {target.name}
              </Text>
            ) : (
              // A plain address: tap the name to drive another address.
              <Pressable
                accessibilityRole="button"
                accessibilityHint={strings.drive.changeAddressHint}
                onPress={onEditAddress}
                style={({pressed}) => [
                  styles.editableName,
                  {
                    minHeight: minTouchTarget,
                    gap: spacing.xs,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[
                    styles.locoName,
                    {color: colors.textPrimary, fontSize: fontSizes.body},
                  ]}
                >
                  {target.name}
                </Text>
                <Icon
                  name="pencil"
                  size={fontSizes.body}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}

            {lives.some((live) => live?.known === false) && connected && (
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
                // Every member at once, without speed differences.
                controller.emergencyStopLocos(addresses);
              }}
            />
          </View>
        </View>
      </View>

      {isConsist && (
        <VehicleStrip
          items={members.map((member) => ({
            key: String(member.address),
            name: member.loco?.name ?? String(member.address),
            photo: member.loco?.photo ?? null,
            address: member.address,
          }))}
          currentKey={String(shownMember.address)}
          onPick={(key) => {
            setFunctionMember(
              members.findIndex((member) => String(member.address) === key),
            );
          }}
          label={strings.drive.members}
          itemLabel={(item) => strings.drive.memberFunctions(item.name)}
        />
      )}
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
  editableName: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
});
