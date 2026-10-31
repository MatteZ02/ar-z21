import {Directory, File, Paths} from 'expo-file-system';
import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {PhotoStore} from './LibraryService';

// Photos are shrunk to this width before storing, so the library stays fast
// on old devices (brief §6.4).
export const PHOTO_MAX_WIDTH = 1024;
const PHOTO_QUALITY = 0.8;
const PHOTO_DIRECTORY = 'photos';

export type PhotoSource = 'camera' | 'library';

export type PickResult =
  | {status: 'picked'; name: string}
  | {status: 'cancelled'}
  | {status: 'permissionDenied'};

const directory = (): Directory => {
  const dir = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!dir.exists) {
    dir.create({intermediates: true});
  }
  return dir;
};

const newName = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;

// The URI to show a stored photo with <Image>.
export const photoUri = (name: string): string =>
  new File(Paths.document, PHOTO_DIRECTORY, name).uri;

// Takes or picks a photo, shrinks it and stores it. Returns its file name.
export const pickPhoto = async (source: PhotoSource): Promise<PickResult> => {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return {status: 'permissionDenied'};
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) {
    return {status: 'cancelled'};
  }
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > PHOTO_MAX_WIDTH) {
    context.resize({width: PHOTO_MAX_WIDTH});
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PHOTO_QUALITY,
  });
  const name = newName();
  await new File(saved.uri).move(new File(directory(), name));
  return {status: 'picked', name};
};

export const filePhotoStore: PhotoStore = {
  copy: (name) => {
    const copyName = newName();
    new File(directory(), name).copySync(new File(directory(), copyName));
    return copyName;
  },
  remove: (name) => {
    const file = new File(directory(), name);
    if (file.exists) {
      file.delete();
    }
  },
};
