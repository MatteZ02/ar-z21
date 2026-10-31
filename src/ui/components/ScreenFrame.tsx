import {ReactNode} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppHeader} from './AppHeader';
import {TrackStatusBanner} from './TrackStatusBanner';

type Props = {
  title: string;
  children: ReactNode;
};

// Every screen: header with the global STOP, track status, then content.
export const ScreenFrame = ({title, children}: Props) => {
  const {colors} = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.frame, {backgroundColor: colors.background}]}
    >
      <AppHeader title={title} />
      <TrackStatusBanner />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
});
