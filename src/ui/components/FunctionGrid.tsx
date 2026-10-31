import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  FUNCTION_PAGES,
  pageRows,
  slotAt,
  usedPages,
} from '../../library/functionSlots';
import {functionIcon} from '../../library/icons';
import {LocoFunction} from '../../library/types';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';

type Props = {
  functions: LocoFunction[];
  // On/off state by function number.
  active: boolean[];
  // Driving: switch a function on or off.
  onChange?: (number: number, on: boolean) => void;
  // Editing: tap a slot to change its function (or add one if empty).
  onEditSlot?: (slot: number, fn: LocoFunction | null) => void;
  disabled?: boolean;
};

// The function buttons, as in the Roco Z21 app: pages C I, C II, C III of
// two columns by six rows. Latching functions toggle on tap; momentary ones
// are on only while held.
export const FunctionGrid = ({
  functions,
  active,
  onChange,
  onEditSlot,
  disabled = false,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const editing = onEditSlot !== undefined;
  const pageCount = editing ? FUNCTION_PAGES : usedPages(functions);
  const [selectedPage, setSelectedPage] = useState(0);
  const page = Math.min(selectedPage, pageCount - 1);

  const cell = (fn: LocoFunction | null, row: number, column: number) => {
    const slot = slotAt(page, row, column);
    if (fn === null) {
      if (!editing) {
        return <View key={column} style={styles.spacer} />;
      }
      return (
        <Pressable
          key={column}
          accessibilityRole="button"
          accessibilityLabel={strings.functionEditor.addHere}
          onPress={() => {
            onEditSlot(slot, null);
          }}
          style={({pressed}) => [
            styles.cell,
            styles.emptyCell,
            {
              minHeight: minTouchTarget,
              borderRadius: radii.md,
              borderColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Icon
            name="plus"
            size={fontSizes.title}
            color={colors.textSecondary}
          />
        </Pressable>
      );
    }
    const on = active[fn.number] === true;
    const foreground = on ? colors.textOnFunctionActive : colors.textPrimary;
    const icon = functionIcon(fn.icon);
    const label =
      fn.name === '' ? String(fn.number) : `${fn.number} ${fn.name}`;
    return (
      <Pressable
        key={column}
        accessibilityRole={editing ? 'button' : 'switch'}
        accessibilityLabel={`${strings.drive.function} ${label}`}
        accessibilityHint={
          fn.momentary ? strings.functionEditor.momentaryHint : undefined
        }
        accessibilityState={editing ? {disabled} : {checked: on, disabled}}
        disabled={disabled}
        onPress={() => {
          if (editing) {
            onEditSlot(slot, fn);
          } else if (!fn.momentary) {
            onChange?.(fn.number, !on);
          }
        }}
        onPressIn={() => {
          if (!editing && fn.momentary) {
            onChange?.(fn.number, true);
          }
        }}
        onPressOut={() => {
          if (!editing && fn.momentary) {
            onChange?.(fn.number, false);
          }
        }}
        style={({pressed}) => [
          styles.cell,
          {
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            padding: spacing.xs,
            // Filled when on, outlined when off: not colour alone.
            backgroundColor: on
              ? colors.functionActive
              : colors.functionInactive,
            borderColor: on ? colors.functionActive : colors.border,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        {icon === null ? (
          <Text
            style={[
              styles.letter,
              {color: foreground, fontSize: fontSizes.title},
            ]}
          >
            {strings.drive.functionLetter}
          </Text>
        ) : (
          <Icon name={icon} size={fontSizes.display} color={foreground} />
        )}
        <Text
          numberOfLines={1}
          style={{color: foreground, fontSize: fontSizes.small}}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {pageCount > 1 && (
        <View
          accessibilityRole="tablist"
          style={[
            styles.tabs,
            {gap: spacing.xs, paddingHorizontal: spacing.sm},
          ]}
        >
          {Array.from({length: pageCount}, (_, index) => {
            const selected = index === page;
            return (
              <Pressable
                key={index}
                accessibilityRole="tab"
                accessibilityLabel={strings.drive.page(index + 1)}
                accessibilityState={{selected}}
                onPress={() => {
                  setSelectedPage(index);
                }}
                style={[
                  styles.tab,
                  {
                    minHeight: minTouchTarget,
                    // Underlined when selected: not colour alone.
                    borderBottomColor: selected
                      ? colors.accent
                      : colors.transparent,
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
                  {strings.drive.pages[index]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <ScrollView
        contentContainerStyle={[
          styles.grid,
          {padding: spacing.sm, gap: spacing.sm},
        ]}
      >
        {pageRows(functions, page).map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.row, {gap: spacing.sm}]}>
            {row.map((fn, column) => cell(fn, rowIndex, column))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  grid: {
    flexGrow: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  spacer: {
    flex: 1,
  },
  emptyCell: {
    borderStyle: 'dashed',
  },
  letter: {
    fontWeight: '800',
  },
});
