import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import {useTheme} from '../../theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  // Shown below the field, e.g. a validation message.
  message?: string;
};

// A labelled text field.
export const FormField = ({label, message, multiline, ...input}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  return (
    <View style={{gap: spacing.xs}}>
      <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        {...input}
        style={[
          styles.input,
          {
            minHeight: multiline ? minTouchTarget * 2 : minTouchTarget,
            color: colors.textPrimary,
            borderColor: message ? colors.statusShortCircuit : colors.border,
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: fontSizes.body,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {message !== undefined && (
        <Text
          accessibilityLiveRegion="polite"
          style={{color: colors.statusShortCircuit, fontSize: fontSizes.small}}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
  },
});
