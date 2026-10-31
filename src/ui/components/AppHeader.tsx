import {useNavigation, useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {ConnectionIndicator} from './ConnectionIndicator';
import {GlobalStopButton} from './GlobalStopButton';
import {Icon} from './Icon';

type Props = {
  title: string;
};

// Header of every screen: back and title on the left, the global STOP in the
// centre (decided by the user), the connection indicator on the right. The
// two sides get equal widths so STOP is always exactly centred.
export const AppHeader = ({title}: Props) => {
  const {colors, spacing, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();
  // This screen's own navigator knows its history from the first render;
  // router.canGoBack() can still be false while the push completes.
  const canGoBack = useNavigation().canGoBack();

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          gap: spacing.xs,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.side, {gap: spacing.xs}]}>
        {canGoBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.back}
            onPress={() => {
              router.back();
            }}
            style={[
              styles.back,
              {minWidth: minTouchTarget, minHeight: minTouchTarget},
            ]}
          >
            <Icon
              name="chevron-left"
              size={fontSizes.display}
              color={colors.accent}
            />
          </Pressable>
        )}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontSize: fontSizes.large,
              paddingLeft: canGoBack ? 0 : spacing.sm,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      <GlobalStopButton />
      <View style={[styles.side, styles.end]}>
        <ConnectionIndicator />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    flex: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  end: {
    justifyContent: 'flex-end',
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontWeight: '600',
  },
});
