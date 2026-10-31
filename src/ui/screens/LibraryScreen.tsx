import {useLocalSearchParams, useRouter} from 'expo-router';
import {useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {VehicleRef} from '../../library/types';
import {useLibraryStore} from '../../store/libraryStore';
import {
  chooseAddressToDrive,
  useThrottleSelection,
} from '../../store/settingsStore';
import {isThrottleIndex, ThrottleIndex} from '../../store/throttleSelection';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {Icon} from '../components/Icon';
import {LocoPhoto} from '../components/LocoPhoto';
import {LocoPicker} from '../components/LocoPicker';
import {ScreenFrame} from '../components/ScreenFrame';
import {pickVehicle} from '../pickVehicle';

// One row of the vehicle list: a loco or a consist.
type Entry = {
  ref: VehicleRef;
  name: string;
  photo: string | null;
  // The loco's address, or the consist's lead loco's.
  address: number | undefined;
  // Consists: number of locos.
  memberCount?: number;
};

const matches = (entry: Entry, query: string): boolean => {
  const text = query.trim().toLowerCase();
  return (
    text === '' ||
    entry.name.toLowerCase().includes(text) ||
    (entry.address !== undefined && String(entry.address).startsWith(text))
  );
};

// The vehicle library (locos and consists), after the Roco app's "Railed
// Vehicles" list. With ?mode=pick it chooses what a throttle drives instead
// of editing.
export const LibraryScreen = () => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();
  const {library} = useServices();
  const params = useLocalSearchParams<{mode?: string; throttle?: string}>();
  const picking = params.mode === 'pick';
  const throttleParam = Number(params.throttle ?? 0);
  const throttle: ThrottleIndex = isThrottleIndex(throttleParam)
    ? throttleParam
    : 0;
  const locos = useLibraryStore((state) => state.locos);
  const consists = useLibraryStore((state) => state.consists);
  const order = useLibraryStore((state) => state.order);
  const loaded = useLibraryStore((state) => state.loaded);
  const error = useLibraryStore((state) => state.error);
  const [query, setQuery] = useState('');
  const [arranging, setArranging] = useState(false);
  const [addressPicker, setAddressPicker] = useState(false);
  const selection = useThrottleSelection(throttle);
  // The address picker starts from the throttle's plain address, if any.
  const pickerAddress = selection.kind === 'address' ? selection.address : 3;
  const pickerSteps = selection.kind === 'address' ? selection.speedSteps : 128;

  const entries = useMemo(
    () =>
      order.flatMap((ref): Entry[] => {
        if (ref.kind === 'loco') {
          const loco = locos.find((entry) => entry.id === ref.id);
          return loco === undefined
            ? []
            : [
                {
                  ref,
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
            ref,
            name: consist.name,
            photo: consist.photo ?? lead?.photo ?? null,
            address: lead?.address,
            memberCount: consist.members.length,
          },
        ];
      }),
    [order, locos, consists],
  );
  const shown = useMemo(
    () =>
      arranging ? entries : entries.filter((entry) => matches(entry, query)),
    [arranging, entries, query],
  );

  const run = (task: Promise<void>) => {
    task.catch(() => {
      Alert.alert(strings.editor.saveFailed);
    });
  };

  const open = (entry: Entry) => {
    if (picking) {
      pickVehicle(throttle, entry.ref, () => {
        router.back();
      });
    } else if (entry.ref.kind === 'loco') {
      router.push(`/library/${entry.ref.id}`);
    } else {
      router.push(`/consist/${entry.ref.id}`);
    }
  };

  const row = ({item, index}: {item: Entry; index: number}) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        item.memberCount === undefined
          ? `${item.address} ${item.name}`
          : `${strings.library.consistBadge}: ${item.name}`
      }
      disabled={arranging}
      onPress={() => {
        open(item);
      }}
      style={({pressed}) => [
        styles.row,
        {
          padding: spacing.sm,
          gap: spacing.md,
          borderBottomColor: colors.border,
          backgroundColor: pressed ? colors.functionInactive : colors.surface,
        },
      ]}
    >
      <LocoPhoto
        photo={item.photo}
        address={item.address}
        style={styles.thumbnail}
      />
      <View style={styles.text}>
        {item.memberCount === undefined ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.large,
              fontWeight: '700',
            }}
          >
            {item.address}
          </Text>
        ) : (
          // Consists are marked with a label and an icon, as Roco's "Train".
          <View style={[styles.badge, {gap: spacing.xs}]}>
            <Icon
              name="link-variant"
              size={fontSizes.large}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSizes.body,
                fontWeight: '700',
              }}
            >
              {strings.library.consistBadge} ·{' '}
              {strings.library.consistMembers(item.memberCount)}
            </Text>
          </View>
        )}
        <Text
          numberOfLines={2}
          style={{color: colors.textPrimary, fontSize: fontSizes.body}}
        >
          {item.name}
        </Text>
      </View>
      {arranging ? (
        <View style={{gap: spacing.xs}}>
          {([-1, 1] as const).map((direction) => {
            const disabled =
              (direction === -1 && index === 0) ||
              (direction === 1 && index === shown.length - 1);
            return (
              <Pressable
                key={direction}
                accessibilityRole="button"
                accessibilityLabel={`${
                  direction === -1
                    ? strings.library.moveUp
                    : strings.library.moveDown
                }: ${item.name}`}
                accessibilityState={{disabled}}
                disabled={disabled}
                onPress={() => {
                  run(library.move(item.ref, direction));
                }}
                style={[
                  styles.moveButton,
                  {
                    width: minTouchTarget,
                    height: minTouchTarget,
                    borderRadius: radii.md,
                    borderColor: colors.border,
                    opacity: disabled ? 0.3 : 1,
                  },
                ]}
              >
                <Icon
                  name={direction === -1 ? 'arrow-up' : 'arrow-down'}
                  size={fontSizes.title}
                  color={colors.accent}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        !picking && (
          <Icon
            name="pencil"
            size={fontSizes.large}
            color={colors.textSecondary}
          />
        )
      )}
    </Pressable>
  );

  const emptyText = error
    ? strings.library.loadError
    : !loaded
      ? ''
      : entries.length === 0
        ? strings.library.empty
        : strings.library.noMatches;

  return (
    <ScreenFrame
      title={picking ? strings.library.pickTitle : strings.library.title}
    >
      <View style={{padding: spacing.md, gap: spacing.sm}}>
        <Text style={{color: colors.textPrimary, fontSize: fontSizes.large}}>
          {strings.library.entries(entries.length)}
        </Text>
        {!arranging && (
          <View
            style={[
              styles.search,
              {
                minHeight: minTouchTarget,
                borderRadius: radii.md,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.sm,
                gap: spacing.sm,
              },
            ]}
          >
            <Icon
              name="magnify"
              size={fontSizes.title}
              color={colors.textSecondary}
            />
            <TextInput
              accessibilityLabel={strings.library.search}
              placeholder={strings.library.search}
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              style={[
                styles.searchInput,
                {color: colors.textPrimary, fontSize: fontSizes.body},
              ]}
            />
          </View>
        )}
        {picking && (
          <AppButton
            label={strings.library.driveByAddress}
            icon="train"
            variant="outline"
            onPress={() => {
              setAddressPicker(true);
            }}
          />
        )}
        {!picking && !arranging && (
          <AppButton
            label={strings.importer.menuEntry}
            icon="file-import"
            variant="outline"
            onPress={() => {
              router.push('/import');
            }}
          />
        )}
      </View>

      <FlatList
        data={shown}
        keyExtractor={(entry) => `${entry.ref.kind}-${entry.ref.id}`}
        renderItem={row}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.body,
              padding: spacing.md,
            }}
          >
            {emptyText}
          </Text>
        }
      />

      {!picking && (
        <View
          style={[
            styles.toolbar,
            {
              padding: spacing.sm,
              gap: spacing.sm,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <AppButton
            label={arranging ? strings.library.done : strings.library.edit}
            icon={arranging ? 'check' : 'sort-numeric-ascending'}
            variant="outline"
            disabled={entries.length < 2 && !arranging}
            onPress={() => {
              setArranging(!arranging);
            }}
          />
          {arranging ? (
            <>
              <AppButton
                label={strings.library.sortByName}
                variant="outline"
                onPress={() => {
                  run(library.sortBy('name'));
                }}
                style={styles.flex}
              />
              <AppButton
                label={strings.library.sortByAddress}
                variant="outline"
                onPress={() => {
                  run(library.sortBy('address'));
                }}
                style={styles.flex}
              />
            </>
          ) : (
            <>
              <AppButton
                label={strings.library.addConsist}
                icon="link-variant"
                variant="outline"
                disabled={locos.length === 0}
                onPress={() => {
                  router.push('/consist/new');
                }}
                style={styles.flex}
              />
              <AppButton
                label={strings.library.add}
                icon="plus"
                onPress={() => {
                  router.push('/library/new');
                }}
                style={styles.flex}
              />
            </>
          )}
        </View>
      )}

      <LocoPicker
        visible={addressPicker}
        address={pickerAddress}
        speedSteps={pickerSteps}
        onCancel={() => {
          setAddressPicker(false);
        }}
        onChoose={(address, speedSteps) => {
          setAddressPicker(false);
          chooseAddressToDrive(throttle, address, speedSteps);
          router.back();
        }}
      />
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: {
    width: '38%',
    // Keeps rows compact on tablets.
    maxWidth: 240,
  },
  text: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
});
