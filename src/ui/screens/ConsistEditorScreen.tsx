import {useLocalSearchParams, usePreventRemove, useRouter} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MAX_SPEED_OFFSET} from '../../consist/consistMath';
import {filePhotoStore, PhotoSource, pickPhoto} from '../../library/photos';
import {ConsistDraft, ConsistMember, Loco} from '../../library/types';
import {ConsistProblem} from '../../library/validation';
import {maxSpeedStep} from '../../protocol';
import {useLibraryStore} from '../../store/libraryStore';
import {forgetVehicle} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {FormField} from '../components/FormField';
import {Icon, IconName} from '../components/Icon';
import {LocoPhoto} from '../components/LocoPhoto';
import {ScreenFrame} from '../components/ScreenFrame';

const emptyForm = (): ConsistDraft => ({name: '', photo: null, members: []});

// Add or edit a consist, after the Roco app's train screen: name, photo and
// the locos in train order, each with its direction and speed difference.
export const ConsistEditorScreen = () => {
  const {colors, spacing, fontSizes} = useTheme();
  const router = useRouter();
  const {library} = useServices();
  const params = useLocalSearchParams<{id: string}>();
  const isNew = params.id === 'new';
  const consistId = isNew ? null : Number(params.id);
  const consist = useLibraryStore((state) =>
    state.consists.find((candidate) => candidate.id === consistId),
  );
  const locos = useLibraryStore((state) => state.locos);
  const loaded = useLibraryStore((state) => state.loaded);

  const [form, setForm] = useState<ConsistDraft>(() => consist ?? emptyForm());
  const [dirty, setDirty] = useState(false);
  const [problems, setProblems] = useState<ConsistProblem[]>([]);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  // The library may still be loading when the screen opens: fill the form
  // once, when the consist arrives.
  const filled = useRef(consist !== undefined);
  useEffect(() => {
    if (!filled.current && consist !== undefined) {
      filled.current = true;
      setForm(consist);
    }
  }, [consist]);

  // Photos picked during this edit. Any not kept when leaving are deleted.
  const sessionPhotos = useRef<string[]>([]);
  const discardSessionPhotos = (keep: string | null) => {
    for (const name of sessionPhotos.current) {
      if (name !== keep) {
        filePhotoStore.remove(name);
      }
    }
    sessionPhotos.current = [];
  };

  // Set to leave once the form is no longer dirty (saved, deleted or
  // discarded): the remove guard below must be off first.
  const [leaveRequested, setLeaveRequested] = useState(false);
  const leave = () => {
    setDirty(false);
    setLeaveRequested(true);
  };
  useEffect(() => {
    if (leaveRequested && !dirty) {
      setLeaveRequested(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/library');
      }
    }
  }, [leaveRequested, dirty, router]);

  usePreventRemove(dirty, () => {
    Alert.alert(strings.editor.discardTitle, strings.editor.discardMessage, [
      {text: strings.editor.keepEditing, style: 'cancel'},
      {
        text: strings.editor.discard,
        style: 'destructive',
        onPress: () => {
          discardSessionPhotos(null);
          leave();
        },
      },
    ]);
  });

  const update = (changes: Partial<ConsistDraft>) => {
    setForm((current) => ({...current, ...changes}));
    setDirty(true);
    setProblems([]);
  };

  const updateMember = (index: number, changes: Partial<ConsistMember>) => {
    update({
      members: form.members.map((member, i) =>
        i === index ? {...member, ...changes} : member,
      ),
    });
  };

  const moveMember = (index: number, direction: -1 | 1) => {
    const members = [...form.members];
    const target = index + direction;
    [members[index], members[target]] = [members[target], members[index]];
    update({members});
  };

  const choosePhoto = async (source: PhotoSource) => {
    setPhotoMessage(null);
    try {
      const result = await pickPhoto(source);
      if (result.status === 'picked') {
        sessionPhotos.current.push(result.name);
        update({photo: result.name});
      } else if (result.status === 'permissionDenied') {
        setPhotoMessage(strings.editor.cameraDenied);
      }
    } catch {
      setPhotoMessage(strings.editor.photoFailed);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const draft = {...form, id: consistId ?? undefined};
      const result = await library.saveConsist(draft);
      if (!result.ok) {
        setProblems(result.problems);
        return;
      }
      discardSessionPhotos(draft.photo);
      leave();
    } catch {
      Alert.alert(strings.editor.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (consistId === null) {
      return;
    }
    Alert.alert(
      strings.consistEditor.deleteTitle,
      strings.consistEditor.deleteMessage(form.name),
      [
        {text: strings.editor.keep, style: 'cancel'},
        {
          text: strings.editor.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            library
              .removeConsist(consistId)
              .then(() => {
                forgetVehicle({kind: 'consist', id: consistId});
                discardSessionPhotos(null);
                leave();
              })
              .catch(() => {
                Alert.alert(strings.editor.saveFailed);
              });
          },
        },
      ],
    );
  };

  if (!isNew && loaded && consist === undefined && !dirty) {
    return (
      <ScreenFrame title={strings.library.title}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes.body,
            padding: spacing.md,
          }}
        >
          {strings.consistEditor.notFound}
        </Text>
      </ScreenFrame>
    );
  }

  const problemText = (key: ConsistProblem) =>
    problems.includes(key) ? strings.consistEditor.problems[key] : undefined;
  const memberIds = new Set(form.members.map((member) => member.locoId));
  const available = locos.filter((loco) => !memberIds.has(loco.id));
  const leadLoco = locos.find((loco) => loco.id === form.members[0]?.locoId);

  return (
    <ScreenFrame
      title={
        form.name.trim() !== '' ? form.name : strings.consistEditor.newTitle
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.md, gap: spacing.lg}}
      >
        <View style={{gap: spacing.sm}}>
          <LocoPhoto photo={form.photo ?? leadLoco?.photo ?? null} />
          <View style={[styles.row, {gap: spacing.sm}]}>
            <AppButton
              label={strings.editor.takePhoto}
              icon="camera"
              variant="outline"
              onPress={() => {
                choosePhoto('camera').catch(() => undefined);
              }}
              style={styles.flex}
            />
            <AppButton
              label={strings.editor.choosePhoto}
              icon="image"
              variant="outline"
              onPress={() => {
                choosePhoto('library').catch(() => undefined);
              }}
              style={styles.flex}
            />
          </View>
          {form.photo !== null && (
            <AppButton
              label={strings.editor.removePhoto}
              icon="delete"
              variant="outline"
              onPress={() => {
                update({photo: null});
              }}
            />
          )}
          {photoMessage !== null && (
            <Text
              accessibilityLiveRegion="polite"
              style={{color: colors.textSecondary, fontSize: fontSizes.small}}
            >
              {photoMessage}
            </Text>
          )}
        </View>

        <FormField
          label={strings.consistEditor.name}
          value={form.name}
          onChangeText={(name) => {
            update({name});
          }}
          maxLength={60}
          message={problemText('nameMissing')}
        />

        <View style={{gap: spacing.sm}}>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.large,
              fontWeight: '700',
            }}
          >
            {strings.consistEditor.members}
          </Text>
          <Text
            style={{color: colors.textSecondary, fontSize: fontSizes.small}}
          >
            {strings.consistEditor.membersHint}
          </Text>
          {(
            ['membersMissing', 'memberDuplicate', 'offsetInvalid'] as const
          ).map(
            (key) =>
              problems.includes(key) && (
                <Text
                  key={key}
                  accessibilityLiveRegion="polite"
                  style={{
                    color: colors.statusShortCircuit,
                    fontSize: fontSizes.small,
                  }}
                >
                  {strings.consistEditor.problems[key]}
                </Text>
              ),
          )}
          {form.members.map((member, index) => {
            const loco = locos.find((entry) => entry.id === member.locoId);
            return loco === undefined ? null : (
              <MemberCard
                key={member.locoId}
                loco={loco}
                member={member}
                first={index === 0}
                last={index === form.members.length - 1}
                onChange={(changes) => {
                  updateMember(index, changes);
                }}
                onMove={(direction) => {
                  moveMember(index, direction);
                }}
                onRemove={() => {
                  update({
                    members: form.members.filter((_, i) => i !== index),
                  });
                }}
              />
            );
          })}
          <AppButton
            label={strings.consistEditor.addMember}
            icon="plus"
            variant="outline"
            onPress={() => {
              setAdding(true);
            }}
          />
        </View>

        {consistId !== null && (
          <AppButton
            label={strings.consistEditor.delete}
            icon="delete"
            variant="danger"
            onPress={confirmDelete}
          />
        )}
      </ScrollView>

      <View
        style={[
          styles.row,
          styles.actions,
          {
            padding: spacing.sm,
            gap: spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <AppButton
          label={strings.editor.cancel}
          variant="outline"
          onPress={() => {
            router.back();
          }}
          style={styles.flex}
        />
        <AppButton
          label={strings.editor.save}
          icon="check"
          disabled={saving || (!dirty && !isNew)}
          onPress={() => {
            save().catch(() => undefined);
          }}
          style={styles.flex}
        />
      </View>

      <MemberPicker
        visible={adding}
        locos={available}
        onCancel={() => {
          setAdding(false);
        }}
        onPick={(loco) => {
          setAdding(false);
          update({
            members: [
              ...form.members,
              {locoId: loco.id, reversed: false, speedOffset: 0},
            ],
          });
        }}
      />
    </ScreenFrame>
  );
};

type MemberCardProps = {
  loco: Loco;
  member: ConsistMember;
  first: boolean;
  last: boolean;
  onChange: (changes: Partial<ConsistMember>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

const MemberCard = ({
  loco,
  member,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: MemberCardProps) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const steps = maxSpeedStep(loco.speedSteps);
  const limit = Math.min(MAX_SPEED_OFFSET, steps - 1);

  const iconButton = (
    icon: IconName,
    label: string,
    onPress: () => void,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${loco.name}`}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          width: minTouchTarget,
          height: minTouchTarget,
          borderRadius: radii.md,
          borderColor: colors.border,
          opacity: disabled ? 0.3 : 1,
        },
      ]}
    >
      <Icon name={icon} size={fontSizes.title} color={colors.accent} />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.card,
        {
          padding: spacing.sm,
          gap: spacing.sm,
          borderRadius: radii.md,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={[styles.row, styles.center, {gap: spacing.sm}]}>
        <LocoPhoto
          photo={loco.photo}
          address={loco.address}
          style={styles.thumbnail}
        />
        <Text
          numberOfLines={2}
          style={[
            styles.flex,
            {color: colors.textPrimary, fontSize: fontSizes.body},
          ]}
        >
          {strings.drive.addressPrefix}
          {loco.address} – {loco.name}
        </Text>
        <View style={{gap: spacing.xs}}>
          {iconButton(
            'arrow-up',
            strings.consistEditor.moveUp,
            () => {
              onMove(-1);
            },
            first,
          )}
          {iconButton(
            'arrow-down',
            strings.consistEditor.moveDown,
            () => {
              onMove(1);
            },
            last,
          )}
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{checked: member.reversed}}
        accessibilityHint={strings.consistEditor.reversedHint}
        onPress={() => {
          onChange({reversed: !member.reversed});
        }}
        style={[
          styles.row,
          styles.center,
          {minHeight: minTouchTarget, gap: spacing.md},
        ]}
      >
        <Text
          style={[
            styles.flex,
            {color: colors.textPrimary, fontSize: fontSizes.body},
          ]}
        >
          {strings.consistEditor.reversed}
        </Text>
        <Switch
          value={member.reversed}
          onValueChange={(reversed) => {
            onChange({reversed});
          }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>

      <View style={{gap: spacing.xs}}>
        <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
          {strings.consistEditor.speedOffset}
        </Text>
        <View style={[styles.row, styles.center, {gap: spacing.sm}]}>
          <AppButton
            label={strings.consistEditor.slowerSymbol}
            accessibilityHint={strings.consistEditor.slower}
            variant="outline"
            disabled={member.speedOffset <= -limit}
            onPress={() => {
              onChange({speedOffset: member.speedOffset - 1});
            }}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.flex,
              styles.offset,
              {color: colors.textPrimary, fontSize: fontSizes.body},
            ]}
          >
            {strings.consistEditor.speedOffsetValue(member.speedOffset, steps)}
          </Text>
          <AppButton
            label={strings.consistEditor.fasterSymbol}
            accessibilityHint={strings.consistEditor.faster}
            variant="outline"
            disabled={member.speedOffset >= limit}
            onPress={() => {
              onChange({speedOffset: member.speedOffset + 1});
            }}
          />
        </View>
        <Text style={{color: colors.textSecondary, fontSize: fontSizes.small}}>
          {strings.consistEditor.speedOffsetHint}
        </Text>
      </View>

      <AppButton
        label={strings.consistEditor.removeMember}
        icon="close"
        variant="outline"
        onPress={onRemove}
      />
    </View>
  );
};

type MemberPickerProps = {
  visible: boolean;
  locos: Loco[];
  onPick: (loco: Loco) => void;
  onCancel: () => void;
};

// Chooses a library loco to add to the consist.
const MemberPicker = ({
  visible,
  locos,
  onPick,
  onCancel,
}: MemberPickerProps) => {
  const {colors, spacing, fontSizes} = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onCancel}
    >
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[styles.flex, {backgroundColor: colors.background}]}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes.title,
            padding: spacing.md,
          }}
        >
          {strings.consistEditor.chooseMember}
        </Text>
        <FlatList
          data={locos}
          keyExtractor={(loco) => String(loco.id)}
          ListEmptyComponent={
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSizes.body,
                padding: spacing.md,
              }}
            >
              {strings.consistEditor.noLocosLeft}
            </Text>
          }
          renderItem={({item}) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.address} ${item.name}`}
              onPress={() => {
                onPick(item);
              }}
              style={({pressed}) => [
                styles.row,
                styles.center,
                styles.pickRow,
                {
                  padding: spacing.sm,
                  gap: spacing.md,
                  borderBottomColor: colors.border,
                  backgroundColor: pressed
                    ? colors.functionInactive
                    : colors.surface,
                },
              ]}
            >
              <LocoPhoto
                photo={item.photo}
                address={item.address}
                style={styles.thumbnail}
              />
              <Text
                style={[
                  styles.flex,
                  {color: colors.textPrimary, fontSize: fontSizes.body},
                ]}
              >
                {strings.drive.addressPrefix}
                {item.address} – {item.name}
              </Text>
            </Pressable>
          )}
        />
        <View style={{padding: spacing.md}}>
          <AppButton
            label={strings.editor.cancel}
            variant="outline"
            onPress={onCancel}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  center: {
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  card: {
    borderWidth: 1,
  },
  thumbnail: {
    width: '30%',
    maxWidth: 160,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  offset: {
    textAlign: 'center',
  },
  pickRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
