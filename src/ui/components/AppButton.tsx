import {Pressable, StyleProp, StyleSheet, Text, ViewStyle} from 'react-native';
import {useTheme} from '../../theme';
import {Icon, IconName} from './Icon';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  icon?: IconName;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  accessibilityHint,
  disabled = false,
  style,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const background = {
    primary: colors.accent,
    outline: 'transparent',
    danger: colors.stopButton,
  }[variant];
  const foreground = {
    primary: colors.textOnAccent,
    outline: colors.accent,
    danger: colors.textOnStopButton,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          minHeight: minTouchTarget,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
          borderRadius: radii.md,
          backgroundColor: background,
          borderColor: variant === 'outline' ? colors.accent : background,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={fontSizes.large} color={foreground} />}
      <Text style={{color: foreground, fontSize: fontSizes.body}}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
