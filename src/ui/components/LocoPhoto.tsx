import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {photoUri} from '../../library/photos';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {Icon} from './Icon';

type Props = {
  photo: string | null;
  // Shown on the placeholder when there is no photo, as in the Roco app.
  address?: number;
  style?: StyleProp<ViewStyle>;
};

// A loco's photo (16:9), or a placeholder with the address.
export const LocoPhoto = ({photo, address, style}: Props) => {
  const {colors, radii, fontSizes, spacing} = useTheme();
  return (
    <View
      style={[
        styles.frame,
        {borderRadius: radii.md, backgroundColor: colors.functionInactive},
        style,
      ]}
    >
      {photo === null ? (
        <View
          accessible
          accessibilityLabel={strings.library.noPhoto}
          style={[styles.placeholder, {gap: spacing.sm}]}
        >
          {address !== undefined && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSizes.title,
                fontWeight: '700',
              }}
            >
              {address}
            </Text>
          )}
          <Icon
            name="train-variant"
            size={fontSizes.display * 1.5}
            color={colors.textSecondary}
          />
        </View>
      ) : (
        <Image
          source={{uri: photoUri(photo)}}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
