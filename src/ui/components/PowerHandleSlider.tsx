import {useRef, useState} from 'react';
import {GestureResponderEvent, StyleSheet, View} from 'react-native';
import {
  fractionFromHandle,
  handleFromFraction,
} from '../../driving/powerHandle';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {feedback} from '../feedback';

type Props = {
  // -1 full brake … 0 coast … +1 full power.
  handle: number;
  onChange: (handle: number) => void;
  disabled?: boolean;
};

// Screen-reader steps: 10 % of power or brake.
const ACCESSIBILITY_STEP = 0.1;

// The power handle drive mode's slider: centre = coast, up = power, down =
// brake. Touch anywhere to set it, drag to change; it stays where it is
// left. The power half shows the green-to-red gradient of the speed slider.
export const PowerHandleSlider = ({
  handle,
  onChange,
  disabled = false,
}: Props) => {
  const {colors, radii, minTouchTarget} = useTheme();
  const [height, setHeight] = useState(0);
  // As in SpeedSlider: pageY of the track's top edge, taken on touch.
  const top = useRef(0);

  const setFromPageY = (pageY: number) => {
    if (disabled || height <= 0) {
      return;
    }
    const next = handleFromFraction(1 - (pageY - top.current) / height);
    if (next !== handle) {
      if (next === 0) {
        // A click into neutral, so coasting can be found without looking.
        feedback.tap();
      }
      onChange(next);
    }
  };

  const onGrant = (event: GestureResponderEvent) => {
    top.current = event.nativeEvent.pageY - event.nativeEvent.locationY;
    setFromPageY(event.nativeEvent.pageY);
  };

  const fraction = fractionFromHandle(handle);
  const percent = Math.round(handle * 100);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={strings.drive.powerHandle}
      accessibilityState={{disabled}}
      accessibilityValue={{
        min: -100,
        max: 100,
        now: percent,
        text: strings.drive.handleState(percent),
      }}
      accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
      onAccessibilityAction={(event) => {
        if (disabled) {
          return;
        }
        const step =
          event.nativeEvent.actionName === 'increment'
            ? ACCESSIBILITY_STEP
            : -ACCESSIBILITY_STEP;
        const next = Math.round((handle + step) * 10) / 10;
        onChange(Math.min(1, Math.max(-1, next)));
      }}
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
      }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={(event) => {
        setFromPageY(event.nativeEvent.pageY);
      }}
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
      {/* Power: from the centre up, revealing a gradient over the top half. */}
      {handle > 0 && (
        <View
          pointerEvents="none"
          style={[styles.power, {height: `${(fraction - 0.5) * 100}%`}]}
        >
          <View
            style={[
              styles.gradient,
              {
                height: height / 2,
                backgroundImage: `linear-gradient(to top, ${colors.throttleFillLow}, ${colors.throttleFillMid}, ${colors.throttleFillHigh})`,
              },
            ]}
          />
        </View>
      )}
      {/* Brake: from the centre down. */}
      {handle < 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.brake,
            {
              height: `${(0.5 - fraction) * 100}%`,
              backgroundColor: colors.throttleBrake,
            },
          ]}
        />
      )}
      {/* The coast mark across the centre. */}
      <View
        pointerEvents="none"
        style={[styles.centre, {backgroundColor: colors.border}]}
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
  power: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '50%',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  brake: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
  },
  centre: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    marginTop: -1,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    marginBottom: -3,
  },
});
