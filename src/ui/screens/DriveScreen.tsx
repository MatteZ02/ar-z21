import {useKeepAwake} from 'expo-keep-awake';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {strings} from '../../strings';
import {useTheme} from '../../theme';
import {ScreenFrame} from '../components/ScreenFrame';
import {Throttle} from '../components/Throttle';
import {throttleCount} from '../layout';

// The drive screen: one throttle on phones, two independent throttles side
// by side on wide screens (brief §6.6, after driving_tablet.PNG). The global
// STOP in the header stops everything.
export const DriveScreen = () => {
  useKeepAwake();
  const {colors} = useTheme();
  const {width, height} = useWindowDimensions();
  const split = throttleCount(width, height) === 2;

  return (
    <ScreenFrame title={strings.drive.title}>
      <View style={styles.row}>
        <Throttle index={0} />
        {split && (
          <>
            <View style={[styles.divider, {backgroundColor: colors.border}]} />
            <Throttle index={1} />
          </>
        )}
      </View>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  divider: {
    width: StyleSheet.hairlineWidth * 2,
  },
});
