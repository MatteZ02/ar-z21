import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';

type Props = {
  // Function numbers to show, in order.
  functions: number[];
  // Current state by function number.
  active: boolean[];
  onToggle: (index: number, on: boolean) => void;
  disabled?: boolean;
};

// Two-column grid of function buttons, as in the Roco Z21 app. Until the loco
// library exists (Phase 3) every function is a latching on/off switch with a
// generic label; names, icons and momentary functions come from the library.
export const FunctionGrid = ({
  functions,
  active,
  onToggle,
  disabled = false,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  return (
    <ScrollView
      contentContainerStyle={[
        styles.grid,
        {padding: spacing.sm, gap: spacing.sm},
      ]}
    >
      {functions.map((index) => {
        const on = active[index] === true;
        const foreground = on
          ? colors.textOnFunctionActive
          : colors.textPrimary;
        return (
          <Pressable
            key={index}
            accessibilityRole="switch"
            accessibilityLabel={`${strings.drive.function} ${index}`}
            accessibilityState={{checked: on, disabled}}
            disabled={disabled}
            onPress={() => {
              onToggle(index, !on);
            }}
            style={({pressed}) => [
              styles.cell,
              {
                minHeight: minTouchTarget * 1.25,
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
            <View style={styles.symbol}>
              {index === 0 ? (
                <Icon
                  name={on ? 'lightbulb-on' : 'lightbulb-outline'}
                  size={fontSizes.display}
                  color={foreground}
                />
              ) : (
                <Text
                  style={[
                    styles.letter,
                    {color: foreground, fontSize: fontSizes.display},
                  ]}
                >
                  {strings.drive.functionLetter}
                </Text>
              )}
            </View>
            <Text style={{color: foreground, fontSize: fontSizes.body}}>
              {index}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '45%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  symbol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontWeight: '800',
  },
});
