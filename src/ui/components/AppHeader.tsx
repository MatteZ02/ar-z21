import {usePathname, useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {ConnectionIndicator} from './ConnectionIndicator';
import {GlobalStopButton} from './GlobalStopButton';
import {Icon} from './Icon';
import {TrackStatusChip} from './TrackStatusChip';

type Props = {
  title: string;
};

// Header of every screen: back and title on the left, the global STOP in the
// centre (decided by the user), the track status chip and the connection
// indicator on the right. The
// two sides get equal widths so STOP is always exactly centred.
export const AppHeader = ({title}: Props) => {
  const {colors, spacing, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();
  // Every screen except the menu has a way back. Decided by route, because
  // the navigator's canGoBack() is read once and can still be false while the
  // screen is being pushed.
  const canGoBack = usePathname() !== '/';

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
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
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
      <View style={[styles.side, styles.end, {gap: spacing.xs}]}>
        <TrackStatusChip />
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
