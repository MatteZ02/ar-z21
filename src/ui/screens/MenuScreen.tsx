import {useRouter} from 'expo-router';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon, IconName} from '../components/Icon';
import {ScreenFrame} from '../components/ScreenFrame';

// Start screen, after the Roco Z21 app's main menu: a list of sections and a
// large button to start driving.
export const MenuScreen = () => {
  const {colors, spacing, radii, fontSizes, minTouchTarget} = useTheme();
  const router = useRouter();

  const row = (
    icon: IconName,
    label: string,
    route: '/settings' | '/library',
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(route);
      }}
      style={({pressed}) => [
        styles.row,
        {
          minHeight: minTouchTarget,
          gap: spacing.md,
          paddingHorizontal: spacing.sm,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={icon} size={fontSizes.display} color={colors.accent} />
      <Text style={{color: colors.textPrimary, fontSize: fontSizes.title}}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScreenFrame title={strings.appName}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {padding: spacing.lg, gap: spacing.lg},
        ]}
      >
        {row('train-variant', strings.menu.vehicles, '/library')}
        {row('cog', strings.menu.settings, '/settings')}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push('/drive');
          }}
          style={({pressed}) => [
            styles.drive,
            {
              minHeight: minTouchTarget * 1.75,
              gap: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: colors.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon
            name="play"
            size={fontSizes.display * 1.25}
            color={colors.textOnAccent}
          />
          <Text
            style={[
              styles.driveLabel,
              {color: colors.textOnAccent, fontSize: fontSizes.display},
            ]}
          >
            {strings.menu.drive}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveLabel: {
    fontWeight: '700',
  },
});
