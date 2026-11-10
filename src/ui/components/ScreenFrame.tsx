import {ReactNode} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppHeader} from './AppHeader';
import {ConnectionBanner} from './ConnectionBanner';

type Props = {
  title: string;
  children: ReactNode;
};

// Every screen: header with the global STOP and track status, a banner for
// connection problems, then content.
export const ScreenFrame = ({title, children}: Props) => {
  const {colors} = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.frame, {backgroundColor: colors.background}]}
    >
      <AppHeader title={title} />
      <ConnectionBanner />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
});
