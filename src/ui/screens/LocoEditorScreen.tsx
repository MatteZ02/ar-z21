import {
  useLocalSearchParams,
  useNavigation,
  usePreventRemove,
  useRouter,
} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {defaultFunctions, nextFreeNumber} from '../../library/functionSlots';
import {filePhotoStore, PhotoSource, pickPhoto} from '../../library/photos';
import {emptyDetails, Loco, LocoDraft, LocoFunction} from '../../library/types';
import {DraftProblem} from '../../library/validation';
import {SpeedSteps} from '../../protocol';
import {useLibraryStore} from '../../store/libraryStore';
import {forgetLoco} from '../../store/settingsStore';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {useServices} from '../AppServices';
import {AppButton} from '../components/AppButton';
import {ChoiceRow} from '../components/ChoiceRow';
import {FormField} from '../components/FormField';
import {FunctionEditor} from '../components/FunctionEditor';
import {FunctionGrid} from '../components/FunctionGrid';
import {LocoPhoto} from '../components/LocoPhoto';
import {ScreenFrame} from '../components/ScreenFrame';

type Tab = 'data' | 'functions';

// The form keeps numbers as text while typing.
type Form = Omit<LocoDraft, 'address' | 'maxSpeed'> & {
  address: string;
  maxSpeed: string;
};

const newForm = (): Form => ({
  name: '',
  address: '',
  speedSteps: 128,
  maxSpeed: '100',
  speedDisplay: 'kmh',
  photo: null,
  notes: '',
  details: emptyDetails(),
  functions: defaultFunctions(),
});

const formFromLoco = (loco: Loco): Form => ({
  ...loco,
  address: String(loco.address),
  maxSpeed: String(loco.maxSpeed),
});

const toNumber = (text: string): number =>
  /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN;

const STEP_OPTIONS: {value: SpeedSteps; label: string}[] = [
  {value: 14, label: '14'},
  {value: 28, label: '28'},
  {value: 128, label: '128'},
];

// Add or edit a library loco, after the Roco app's vehicle screen: a Data tab
// and a Functions tab laid out like the drive screen.
export const LocoEditorScreen = () => {
  const {colors, spacing, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const {library} = useServices();
  const params = useLocalSearchParams<{id: string}>();
  const isNew = params.id === 'new';
  const locoId = isNew ? null : Number(params.id);
  const loco = useLibraryStore((state) =>
    state.locos.find((candidate) => candidate.id === locoId),
  );
  const loaded = useLibraryStore((state) => state.loaded);

  const [form, setForm] = useState<Form>(() =>
    loco === undefined ? newForm() : formFromLoco(loco),
  );
  const [dirty, setDirty] = useState(false);
  // The library may still be loading when the screen opens: fill the form
  // once, when the loco arrives.
  const filled = useRef(loco !== undefined);
  useEffect(() => {
    if (!filled.current && loco !== undefined) {
      filled.current = true;
      setForm(formFromLoco(loco));
    }
  }, [loco]);
  const [tab, setTab] = useState<Tab>('data');
  const [problems, setProblems] = useState<DraftProblem[]>([]);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<LocoFunction | null>(null);
  const [saving, setSaving] = useState(false);
  // Photos picked during this edit. Any not kept when leaving are deleted.
  const sessionPhotos = useRef<string[]>([]);
  // Set when leaving on purpose (saved or deleted): no discard question.
  const leaving = useRef(false);

  const discardSessionPhotos = (keep: string | null) => {
    for (const name of sessionPhotos.current) {
      if (name !== keep) {
        filePhotoStore.remove(name);
      }
    }
    sessionPhotos.current = [];
  };

  // Unsaved changes are a real mistake to lose: confirm before leaving,
  // whether by Cancel, the back arrow or the system back gesture.
  usePreventRemove(dirty, ({data}) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(strings.editor.discardTitle, strings.editor.discardMessage, [
      {text: strings.editor.keepEditing, style: 'cancel'},
      {
        text: strings.editor.discard,
        style: 'destructive',
        onPress: () => {
          discardSessionPhotos(null);
          leaving.current = true;
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const update = (changes: Partial<Form>) => {
    setForm((current) => ({...current, ...changes}));
    setDirty(true);
    setProblems([]);
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
    const draft: LocoDraft = {
      ...form,
      id: locoId ?? undefined,
      address: toNumber(form.address),
      maxSpeed: toNumber(form.maxSpeed),
    };
    try {
      const result = await library.save(draft);
      if (!result.ok) {
        setProblems(result.problems);
        setTab('data');
        return;
      }
      discardSessionPhotos(draft.photo);
      leaving.current = true;
      setDirty(false);
      router.back();
    } catch {
      Alert.alert(strings.editor.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (locoId === null) {
      return;
    }
    Alert.alert(
      strings.editor.deleteTitle,
      strings.editor.deleteMessage(form.name),
      [
        {text: strings.editor.keep, style: 'cancel'},
        {
          text: strings.editor.deleteConfirm,
          style: 'destructive',
          onPress: () => {
            library
              .remove(locoId)
              .then(() => {
                forgetLoco(locoId);
                discardSessionPhotos(null);
                leaving.current = true;
                router.back();
              })
              .catch(() => {
                Alert.alert(strings.editor.saveFailed);
              });
          },
        },
      ],
    );
  };

  const duplicate = () => {
    if (locoId === null) {
      return;
    }
    library
      .duplicate(locoId, strings.editor.copyName)
      .then((copyId) => {
        if (copyId !== null) {
          router.replace(`/library/${copyId}`);
        }
      })
      .catch(() => {
        Alert.alert(strings.editor.saveFailed);
      });
  };

  if (!isNew && loaded && loco === undefined && !dirty) {
    return (
      <ScreenFrame title={strings.library.title}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes.body,
            padding: spacing.md,
          }}
        >
          {strings.editor.notFound}
        </Text>
      </ScreenFrame>
    );
  }

  const problem = (key: DraftProblem) =>
    problems.includes(key) ? strings.editor.problems[key] : undefined;
  const functionProblems = problems.filter((key) => key.startsWith('function'));

  const tabButton = (value: Tab, label: string) => {
    const selected = tab === value;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{selected}}
        onPress={() => {
          setTab(value);
        }}
        style={[
          styles.tab,
          {
            minHeight: minTouchTarget,
            borderBottomColor: selected ? colors.accent : colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: selected ? colors.accent : colors.textSecondary,
            fontSize: fontSizes.large,
            fontWeight: selected ? '700' : '400',
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenFrame
      title={form.name.trim() !== '' ? form.name : strings.editor.newTitle}
    >
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabButton('data', strings.editor.dataTab)}
        {tabButton('functions', strings.editor.functionsTab)}
      </View>

      {tab === 'data' ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{padding: spacing.md, gap: spacing.lg}}
        >
          <View style={{gap: spacing.sm}}>
            <LocoPhoto
              photo={form.photo}
              address={toNumber(form.address) || undefined}
            />
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
            label={strings.editor.name}
            value={form.name}
            onChangeText={(name) => {
              update({name});
            }}
            maxLength={60}
            message={problem('nameMissing')}
          />
          <FormField
            label={strings.editor.address}
            value={form.address}
            onChangeText={(address) => {
              update({address});
            }}
            keyboardType="number-pad"
            maxLength={5}
            message={problem('addressInvalid')}
          />
          <ChoiceRow
            label={strings.editor.speedSteps}
            options={STEP_OPTIONS}
            value={form.speedSteps}
            onChange={(speedSteps) => {
              update({speedSteps});
            }}
          />
          <ChoiceRow
            label={strings.editor.speedDisplay}
            options={(['kmh', 'step', 'mph'] as const).map((value) => ({
              value,
              label: strings.editor.speedDisplays[value],
            }))}
            value={form.speedDisplay}
            onChange={(speedDisplay) => {
              update({speedDisplay});
            }}
          />
          <FormField
            label={strings.editor.maxSpeed}
            value={form.maxSpeed}
            onChangeText={(maxSpeed) => {
              update({maxSpeed});
            }}
            keyboardType="number-pad"
            maxLength={3}
            message={problem('maxSpeedInvalid')}
          />
          <FormField
            label={strings.editor.notes}
            value={form.notes}
            onChangeText={(notes) => {
              update({notes});
            }}
            multiline
          />

          <Text
            accessibilityRole="header"
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.large,
              fontWeight: '700',
            }}
          >
            {strings.editor.details}
          </Text>
          {(
            [
              ['fullName', strings.editor.fullName],
              ['railway', strings.editor.railway],
              ['articleNumber', strings.editor.articleNumber],
              ['decoderType', strings.editor.decoderType],
              ['buildYear', strings.editor.buildYear],
            ] as const
          ).map(([key, label]) => (
            <FormField
              key={key}
              label={label}
              value={form.details[key]}
              onChangeText={(text) => {
                update({details: {...form.details, [key]: text}});
              }}
              maxLength={80}
            />
          ))}

          {locoId !== null && (
            <View style={{gap: spacing.sm}}>
              <AppButton
                label={strings.editor.duplicate}
                icon="content-copy"
                variant="outline"
                disabled={dirty}
                onPress={duplicate}
              />
              <AppButton
                label={strings.editor.delete}
                icon="delete"
                variant="danger"
                onPress={confirmDelete}
              />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.small,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
            }}
          >
            {strings.editor.functionsHint}
          </Text>
          {functionProblems.map((key) => (
            <Text
              key={key}
              style={{
                color: colors.statusShortCircuit,
                fontSize: fontSizes.small,
                paddingHorizontal: spacing.md,
              }}
            >
              {strings.editor.problems[key]}
            </Text>
          ))}
          <FunctionGrid
            functions={form.functions}
            active={[]}
            onEditSlot={(slot, fn) => {
              if (fn !== null) {
                setEditing(fn);
                return;
              }
              const number = nextFreeNumber(form.functions);
              if (number === null) {
                Alert.alert(strings.functionEditor.allNumbersUsed);
                return;
              }
              setEditing({
                number,
                name: '',
                icon: 'none',
                momentary: false,
                slot,
              });
            }}
          />
        </View>
      )}

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

      <FunctionEditor
        fn={editing}
        usedNumbers={form.functions
          .filter((fn) => fn.slot !== editing?.slot)
          .map((fn) => fn.number)}
        onCancel={() => {
          setEditing(null);
        }}
        onRemove={() => {
          if (editing !== null) {
            update({
              functions: form.functions.filter(
                (fn) => fn.slot !== editing.slot,
              ),
            });
          }
          setEditing(null);
        }}
        onDone={(edited) => {
          update({
            functions: [
              ...form.functions.filter((fn) => fn.slot !== edited.slot),
              edited,
            ],
          });
          setEditing(null);
        }}
      />
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  row: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
