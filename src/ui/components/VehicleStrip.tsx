import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';
import {LocoPhoto} from './LocoPhoto';

export type StripItem = {
  key: string;
  name: string;
  photo: string | null;
  address?: number;
};

type Props = {
  items: StripItem[];
  currentKey: string | null;
  onPick: (key: string) => void;
  // Shows the library button first, as in the Roco app's bottom strip.
  onOpenLibrary?: () => void;
  // Accessibility label of the strip and of each item.
  label: string;
  itemLabel: (item: StripItem, current: boolean) => string;
};

// A horizontal strip of photos: the recently driven locos and consists
// below the throttle, or the members of a consist above it.
export const VehicleStrip = ({
  items,
  currentKey,
  onPick,
  onOpenLibrary,
  label,
  itemLabel,
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
      {onOpenLibrary !== undefined && (
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
          <Icon
            name="view-grid"
            size={fontSizes.display}
            color={colors.accent}
          />
        </Pressable>
      )}
      <ScrollView
        horizontal
        accessibilityLabel={label}
        contentContainerStyle={{gap: spacing.sm}}
      >
        {items.map((item) => {
          const current = item.key === currentKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={itemLabel(item, current)}
              accessibilityState={{selected: current}}
              onPress={() => {
                onPick(item.key);
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
              <LocoPhoto photo={item.photo} address={item.address} />
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
