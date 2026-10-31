import {ReactNode} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';

type Props = {
  forward: boolean;
  onChange: (forward: boolean) => void;
  disabled?: boolean;
  // Shown between the arrows (the loco's picture or address).
  children: ReactNode;
};

// Direction arrows either side of the loco, as in the Roco Z21 app: the
// arrow of the current direction is highlighted; tap the other to reverse.
export const DirectionControl = ({
  forward,
  onChange,
  disabled = false,
  children,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();

  const arrow = (isForward: boolean) => {
    const selected = forward === isForward;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={
          isForward ? strings.drive.setForward : strings.drive.setReverse
        }
        accessibilityState={{selected, disabled}}
        disabled={disabled}
        onPress={() => {
          if (!selected) {
            onChange(isForward);
          }
        }}
        style={({pressed}) => [
          styles.arrow,
          {
            minWidth: minTouchTarget,
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            // Filled when selected, outlined otherwise: not colour alone.
            backgroundColor: selected ? colors.accent : 'transparent',
            borderColor: selected ? colors.accent : colors.border,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <Icon
          name={isForward ? 'menu-right' : 'menu-left'}
          size={fontSizes.display * 1.25}
          color={selected ? colors.textOnAccent : colors.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.row, {gap: spacing.sm}]}
    >
      {arrow(false)}
      <View style={styles.middle}>{children}</View>
      {arrow(true)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
  },
});
