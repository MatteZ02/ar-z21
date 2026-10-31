import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Loco} from '../../library/types';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';
import {LocoPhoto} from './LocoPhoto';

type Props = {
  locos: Loco[];
  currentId: number | null;
  onPick: (loco: Loco) => void;
  onOpenLibrary: () => void;
};

// Bottom strip of the drive screen, as in the Roco Z21 app: a button for the
// whole library, then the recently driven locos for quick switching.
export const RecentLocoStrip = ({
  locos,
  currentId,
  onPick,
  onOpenLibrary,
}: Props) => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  return (
    <View
      style={[
        styles.strip,
        {
          gap: spacing.sm,
          padding: spacing.sm,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.drive.library}
        onPress={onOpenLibrary}
        style={({pressed}) => [
          styles.library,
          {
            width: minTouchTarget,
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Icon name="view-grid" size={fontSizes.display} color={colors.accent} />
      </Pressable>
      <ScrollView
        horizontal
        accessibilityLabel={strings.drive.recent}
        contentContainerStyle={{gap: spacing.sm}}
      >
        {locos.map((loco) => {
          const current = loco.id === currentId;
          return (
            <Pressable
              key={loco.id}
              accessibilityRole="button"
              accessibilityLabel={
                current
                  ? `${strings.drive.current}: ${loco.name}`
                  : strings.drive.switchTo(loco.name)
              }
              accessibilityState={{selected: current}}
              onPress={() => {
                onPick(loco);
              }}
              style={({pressed}) => [
                styles.item,
                {
                  width: minTouchTarget * 2,
                  paddingBottom: spacing.xs,
                  // Underlined when current, as in the Roco app.
                  borderBottomColor: current
                    ? colors.accent
                    : colors.transparent,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <LocoPhoto photo={loco.photo} address={loco.address} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  library: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    borderBottomWidth: 3,
  },
});
