import {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MAX_FUNCTION_NUMBER} from '../../library/functionSlots';
import {FUNCTION_ICON_IDS, functionIcon} from '../../library/icons';
import {LocoFunction} from '../../library/types';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {AppButton} from './AppButton';
import {FormField} from './FormField';
import {Icon} from './Icon';

type Props = {
  // The function being edited; null hides the dialog.
  fn: LocoFunction | null;
  // Numbers used by the loco's other functions.
  usedNumbers: number[];
  onDone: (fn: LocoFunction) => void;
  onRemove: () => void;
  onCancel: () => void;
};

// Edits one function: number, name, icon and latching/momentary.
export const FunctionEditor = (props: Props) => (
  <Modal
    visible={props.fn !== null}
    animationType="slide"
    supportedOrientations={['portrait', 'landscape']}
    onRequestClose={props.onCancel}
  >
    {props.fn !== null && (
      // Keyed so the form starts fresh for each function.
      <EditorBody
        key={`${props.fn.slot}-${props.fn.number}`}
        {...props}
        fn={props.fn}
      />
    )}
  </Modal>
);

const EditorBody = ({
  fn,
  usedNumbers,
  onDone,
  onRemove,
  onCancel,
}: Props & {fn: LocoFunction}) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const [numberText, setNumberText] = useState(String(fn.number));
  const [name, setName] = useState(fn.name);
  const [icon, setIcon] = useState(fn.icon);
  const [momentary, setMomentary] = useState(fn.momentary);

  const number = Number(numberText);
  const numberValid =
    /^\d+$/.test(numberText) && number >= 0 && number <= MAX_FUNCTION_NUMBER;
  const numberTaken = numberValid && usedNumbers.includes(number);
  const canSave = numberValid && !numberTaken;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.screen, {backgroundColor: colors.background}]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.md, gap: spacing.lg}}
      >
        <Text
          accessibilityRole="header"
          style={{color: colors.textPrimary, fontSize: fontSizes.title}}
        >
          {strings.functionEditor.title(numberValid ? number : fn.number)}
        </Text>
        <FormField
          label={strings.functionEditor.number}
          value={numberText}
          onChangeText={setNumberText}
          keyboardType="number-pad"
          maxLength={2}
          message={
            !numberValid
              ? strings.editor.problems.functionNumberInvalid
              : numberTaken
                ? strings.functionEditor.numberTaken
                : undefined
          }
        />
        <FormField
          label={strings.functionEditor.name}
          value={name}
          onChangeText={setName}
          maxLength={30}
        />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{checked: momentary}}
          accessibilityHint={strings.functionEditor.momentaryHint}
          onPress={() => {
            setMomentary(!momentary);
          }}
          style={[styles.row, {minHeight: minTouchTarget, gap: spacing.md}]}
        >
          <View style={styles.flex}>
            <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
              {strings.functionEditor.momentary}
            </Text>
            <Text
              style={{color: colors.textSecondary, fontSize: fontSizes.small}}
            >
              {strings.functionEditor.momentaryHint}
            </Text>
          </View>
          <Switch
            value={momentary}
            onValueChange={setMomentary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        <View style={{gap: spacing.sm}}>
          <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
            {strings.functionEditor.icon}
          </Text>
          <View
            accessibilityRole="radiogroup"
            style={[styles.icons, {gap: spacing.sm}]}
          >
            {FUNCTION_ICON_IDS.map((id) => {
              const selected = id === icon;
              const glyph = functionIcon(id);
              const foreground = selected
                ? colors.textOnAccent
                : colors.textPrimary;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityLabel={strings.functionIcons[id]}
                  accessibilityState={{selected}}
                  onPress={() => {
                    setIcon(id);
                  }}
                  style={[
                    styles.iconOption,
                    {
                      minHeight: minTouchTarget * 1.5,
                      borderRadius: radii.md,
                      padding: spacing.xs,
                      backgroundColor: selected
                        ? colors.accent
                        : colors.functionInactive,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {glyph === null ? (
                    <Text
                      style={[
                        styles.letter,
                        {color: foreground, fontSize: fontSizes.title},
                      ]}
                    >
                      {strings.drive.functionLetter}
                    </Text>
                  ) : (
                    <Icon
                      name={glyph}
                      size={fontSizes.display}
                      color={foreground}
                    />
                  )}
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.iconLabel,
                      {color: foreground, fontSize: fontSizes.small},
                    ]}
                  >
                    {strings.functionIcons[id]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actions,
          {
            padding: spacing.md,
            gap: spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <AppButton
          label={strings.functionEditor.remove}
          icon="delete"
          variant="outline"
          onPress={onRemove}
        />
        <View style={[styles.row, {gap: spacing.sm}]}>
          <AppButton
            label={strings.editor.cancel}
            variant="outline"
            onPress={onCancel}
            style={styles.flex}
          />
          <AppButton
            label={strings.functionEditor.done}
            disabled={!canSave}
            onPress={() => {
              onDone({...fn, number, name: name.trim(), icon, momentary});
            }}
            style={styles.flex}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconOption: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  iconLabel: {
    textAlign: 'center',
  },
  letter: {
    fontWeight: '800',
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
