import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  FUNCTION_PAGES,
  pageRows,
  SLOT_ROWS,
  slotAt,
  usedPages,
} from '../../library/functionSlots';
import {functionIcon} from '../../library/icons';
import {LocoFunction} from '../../library/types';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {functionPagesPerView, MAX_FUNCTION_ROW_HEIGHT} from '../layout';
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
  const [height, setHeight] = useState(0);
  const [selectedView, setSelectedView] = useState(0);

  // Taller screens show several pages stacked; the tabs then switch between
  // groups of pages. Without tabs there is more room, so check that first.
  const fit = (available: number) =>
    functionPagesPerView(available, SLOT_ROWS, spacing.sm, pageCount);
  const gridHeight = height - 2 * spacing.sm;
  const perViewNoTabs = fit(gridHeight);
  const perView =
    perViewNoTabs >= pageCount ? pageCount : fit(gridHeight - minTouchTarget);
  const viewCount = Math.ceil(pageCount / perView);
  const view = Math.min(selectedView, viewCount - 1);
  const pages = Array.from(
    {length: Math.min(perView, pageCount - view * perView)},
    (_, offset) => view * perView + offset,
  );
  const viewLabel = (index: number) => {
    const first = index * perView;
    const last = Math.min(pageCount, first + perView) - 1;
    return first === last
      ? strings.drive.pages[first]
      : strings.drive.pageRange(first, last);
  };

  const cell = (
    fn: LocoFunction | null,
    page: number,
    row: number,
    column: number,
  ) => {
    const slot = slotAt(page, row, column);
    if (fn === null) {
      if (!editing) {
        // Same border width as a button, so both columns stay equally wide.
        return (
          <View
            key={column}
            style={[styles.spacer, {borderColor: colors.transparent}]}
          />
        );
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
    <View
      style={styles.container}
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
      }}
    >
      {viewCount > 1 && (
        <View
          accessibilityRole="tablist"
          style={[
            styles.tabs,
            {gap: spacing.xs, paddingHorizontal: spacing.sm},
          ]}
        >
          {Array.from({length: viewCount}, (_, index) => {
            const selected = index === view;
            return (
              <Pressable
                key={index}
                accessibilityRole="tab"
                accessibilityLabel={strings.drive.page(index * perView + 1)}
                accessibilityState={{selected}}
                onPress={() => {
                  setSelectedView(index);
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
                  {viewLabel(index)}
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
        {pages.map((page, index) => [
          // Stacked pages: name each page after the first, so the C I / C II
          // layout of the Roco app stays recognisable.
          index > 0 && (
            <Text
              key={`label-${page}`}
              accessibilityRole="header"
              style={{color: colors.textSecondary, fontSize: fontSizes.body}}
            >
              {strings.drive.pages[page]}
            </Text>
          ),
          ...pageRows(functions, page).map((row, rowIndex) => (
            <View
              key={`${page}-${rowIndex}`}
              style={[
                styles.row,
                {gap: spacing.sm, maxHeight: MAX_FUNCTION_ROW_HEIGHT},
              ]}
            >
              {row.map((fn, column) => cell(fn, page, rowIndex, column))}
            </View>
          )),
        ])}
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
    borderWidth: 2,
  },
  emptyCell: {
    borderStyle: 'dashed',
  },
  letter: {
    fontWeight: '800',
  },
});
