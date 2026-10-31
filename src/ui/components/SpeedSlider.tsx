import {useState} from 'react';
import {GestureResponderEvent, StyleSheet, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';

type Props = {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

// Tall vertical speed control, bottom = stop, top = full speed, like the Roco
// Z21 app's throttle. Touch anywhere to jump to that speed, drag to change.
// Screen readers can step it up and down by one.
export const SpeedSlider = ({
  value,
  max,
  onChange,
  disabled = false,
}: Props) => {
  const {colors, radii, minTouchTarget} = useTheme();
  const [height, setHeight] = useState(0);

  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const setFromTouch = (event: GestureResponderEvent) => {
    if (disabled || height <= 0) {
      return;
    }
    const position = 1 - event.nativeEvent.locationY / height;
    const speed = Math.round(Math.min(1, Math.max(0, position)) * max);
    if (speed !== value) {
      onChange(speed);
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={strings.drive.speed}
      accessibilityState={{disabled}}
      accessibilityValue={{min: 0, max, now: value}}
      accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
      onAccessibilityAction={(event) => {
        if (disabled) {
          return;
        }
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        onChange(Math.min(max, Math.max(0, value + step)));
      }}
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
      }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      // Keep the gesture even if a parent would like to scroll.
      onResponderTerminationRequest={() => false}
      onResponderGrant={setFromTouch}
      onResponderMove={setFromTouch}
      style={[
        styles.track,
        {
          minWidth: minTouchTarget * 1.5,
          borderRadius: radii.lg,
          backgroundColor: colors.throttleTrack,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {/* Children ignore touches, so locationY is always relative to the
          track itself. */}
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            height: `${fraction * 100}%`,
            backgroundColor: colors.throttleFill,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            bottom: `${fraction * 100}%`,
            backgroundColor: colors.throttleThumb,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    marginBottom: -3,
  },
});
