import {useState} from 'react';
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

// Placeholder proportions, relative to the frame. A digit is about 0.6 of
// the font size wide; the icon is ICON_TO_TEXT times the font size.
const TEXT_HEIGHT_SHARE = 0.4;
const DIGIT_WIDTH = 0.6;
const ICON_TO_TEXT = 1.6;

// A loco's photo (16:9), or a placeholder with the address.
export const LocoPhoto = ({photo, address, style}: Props) => {
  const {colors, radii, fontSizes, spacing} = useTheme();
  const [size, setSize] = useState({width: 0, height: 0});

  // The placeholder scales with the frame, so that a long address and the
  // icon fit side by side even in the small vehicle strip.
  const placeholder = () => {
    const gap = spacing.xs;
    const digits = address === undefined ? 0 : String(address).length;
    const usableWidth = size.width - 2 * spacing.sm - (digits > 0 ? gap : 0);
    const fontSize = Math.min(
      fontSizes.title,
      size.height * TEXT_HEIGHT_SHARE,
      usableWidth / (digits * DIGIT_WIDTH + ICON_TO_TEXT),
    );
    const iconSize = Math.min(
      fontSize * ICON_TO_TEXT,
      fontSizes.display * 1.5,
      size.height * 0.8,
    );
    return (
      <View
        accessible
        accessibilityLabel={strings.library.noPhoto}
        onLayout={(event) => {
          const {width, height} = event.nativeEvent.layout;
          setSize({width, height});
        }}
        style={[styles.placeholder, {gap, paddingHorizontal: spacing.sm}]}
      >
        {size.width > 0 && (
          <>
            {address !== undefined && (
              <Text
                numberOfLines={1}
                // Large system font sizes would not fit otherwise.
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={[
                  styles.address,
                  {
                    color: colors.textSecondary,
                    fontSize,
                  },
                ]}
              >
                {address}
              </Text>
            )}
            <Icon
              name="train-variant"
              size={iconSize}
              color={colors.textSecondary}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.frame,
        {borderRadius: radii.md, backgroundColor: colors.functionInactive},
        style,
      ]}
    >
      {photo === null ? (
        placeholder()
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
  address: {
    flexShrink: 1,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
