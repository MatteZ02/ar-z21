import {Alert, Dimensions} from 'react-native';
import {VehicleRef} from '../library/types';
import {useLibraryStore} from '../store/libraryStore';
import {chooseVehicleToDrive, useSettingsStore} from '../store/settingsStore';
import {
  consistConflicts,
  selectionFor,
  ThrottleIndex,
} from '../store/throttleSelection';
import {strings} from '../strings';
import {throttleCount} from './layout';

// Puts a loco or consist on a throttle. If a consist and the other throttle
// would both drive the same loco, asks first (brief §6.7). The other throttle
// only counts while it is on screen (split screen). Calls onDone once the
// choice is made.
export const pickVehicle = (
  index: ThrottleIndex,
  ref: VehicleRef,
  onDone?: () => void,
): void => {
  const {locos, consists} = useLibraryStore.getState();
  const {width, height} = Dimensions.get('window');
  const other =
    throttleCount(width, height) === 2
      ? useSettingsStore.getState().throttles[index === 0 ? 1 : 0]
      : undefined;
  const conflicts =
    other === undefined
      ? []
      : consistConflicts(selectionFor(ref), other, locos, consists);
  const choose = () => {
    chooseVehicleToDrive(index, ref);
    onDone?.();
  };
  if (conflicts.length === 0) {
    choose();
    return;
  }
  Alert.alert(
    strings.drive.conflictTitle,
    strings.drive.conflictMessage(conflicts),
    [
      {text: strings.drive.cancel, style: 'cancel'},
      {text: strings.drive.driveAnyway, onPress: choose},
    ],
  );
};
