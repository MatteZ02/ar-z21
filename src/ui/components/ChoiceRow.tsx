import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme';

type Props<T extends string | number> = {
  label: string;
  options: {value: T; label: string}[];
  // null: nothing selected (e.g. a "for all" row when choices differ).
  value: T | null;
  onChange: (value: T) => void;
};

// One choice out of a few, as a row of large buttons. The selected one is
// filled, the others outlined (not colour alone).
export const ChoiceRow = <T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  return (
    <View style={{gap: spacing.xs}}>
      <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.row, {gap: spacing.sm}]}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              onPress={() => {
                onChange(option.value);
              }}
              style={[
                styles.option,
                {
                  minHeight: minTouchTarget,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.sm,
                  backgroundColor: selected
                    ? colors.accent
                    : colors.functionInactive,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.textOnAccent : colors.textPrimary,
                  fontSize: fontSizes.body,
                  fontWeight: selected ? '700' : '400',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
