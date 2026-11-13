import {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {isValidLocoAddress, SpeedSteps} from '../../protocol';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {AppButton} from './AppButton';

type Props = {
  visible: boolean;
  address: number;
  speedSteps: SpeedSteps;
  onChoose: (address: number, speedSteps: SpeedSteps) => void;
  onCancel: () => void;
};

const STEP_OPTIONS: SpeedSteps[] = [14, 28, 128];

// Pick a loco by address (one that is not in the library): from Vehicles →
// Drive by address, or by tapping the address on the drive screen.
export const LocoPicker = ({
  visible,
  address,
  speedSteps,
  onChoose,
  onCancel,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const [addressText, setAddressText] = useState(String(address));
  const [steps, setSteps] = useState(speedSteps);
  const parsed = Number(addressText);
  const valid = /^\d+$/.test(addressText) && isValidLocoAddress(parsed);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onCancel}
      onShow={() => {
        setAddressText(String(address));
        setSteps(speedSteps);
      }}
    >
      <View style={[styles.scrim, {backgroundColor: colors.scrim}]}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.lg,
              gap: spacing.md,
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={{color: colors.textPrimary, fontSize: fontSizes.title}}
          >
            {strings.drive.chooseLocoTitle}
          </Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
            {strings.drive.address}
          </Text>
          <TextInput
            accessibilityLabel={strings.drive.address}
            value={addressText}
            onChangeText={setAddressText}
            keyboardType="number-pad"
            maxLength={5}
            selectTextOnFocus
            style={[
              styles.input,
              {
                minHeight: minTouchTarget,
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.md,
                fontSize: fontSizes.title,
              },
            ]}
          />
          {!valid && (
            <Text
              style={{color: colors.textSecondary, fontSize: fontSizes.small}}
            >
              {strings.drive.invalidAddress}
            </Text>
          )}
          <Text style={{color: colors.textPrimary, fontSize: fontSizes.body}}>
            {strings.drive.speedSteps}
          </Text>
          <View
            accessibilityRole="radiogroup"
            style={[styles.row, {gap: spacing.sm}]}
          >
            {STEP_OPTIONS.map((option) => {
              const selected = option === steps;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{selected}}
                  onPress={() => {
                    setSteps(option);
                  }}
                  style={[
                    styles.option,
                    {
                      minHeight: minTouchTarget,
                      borderRadius: radii.md,
                      backgroundColor: selected
                        ? colors.accent
                        : colors.functionInactive,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.textOnAccent
                        : colors.textPrimary,
                      fontSize: fontSizes.large,
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.row, {gap: spacing.sm}]}>
            <AppButton
              label={strings.drive.cancel}
              variant="outline"
              onPress={onCancel}
              style={styles.flex}
            />
            <AppButton
              label={strings.drive.use}
              disabled={!valid}
              onPress={() => {
                onChoose(parsed, steps);
              }}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  input: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  flex: {
    flex: 1,
  },
});
