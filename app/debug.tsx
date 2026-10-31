import {strings} from '../src/strings';
import {ScreenFrame} from '../src/ui/components/ScreenFrame';
import {ConnectionDebugScreen} from '../src/ui/debug/ConnectionDebugScreen';

const DebugRoute = () => (
  <ScreenFrame title={strings.debug.title}>
    <ConnectionDebugScreen />
  </ScreenFrame>
);

export default DebugRoute;
