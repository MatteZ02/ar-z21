import * as DocumentPicker from 'expo-document-picker';
import {File, Paths} from 'expo-file-system';
import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';
import * as SQLite from 'expo-sqlite';
import {unzipSync} from 'fflate';
import {
  PHOTO_MAX_WIDTH,
  PHOTO_QUALITY,
  storeImageFile,
} from '../library/photos';
import {readRocoExport, RocoExport} from './rocoExport';

// Native side of the import: choose the file, unzip it, open its database
// in memory and copy photos into the app. The reading itself is pure logic in
// rocoExport.ts.

export type OpenedExport = {
  data: RocoExport;
  // Copies one photo of the export into the app's photo store (shrunk like
  // other photos); returns its stored name, or null if it failed.
  storePhoto: (name: string) => Promise<string | null>;
  close: () => Promise<void>;
};

export type PickExportResult =
  | {status: 'opened'; opened: OpenedExport; fileName: string}
  | {status: 'cancelled'}
  | {status: 'invalid'};

const baseName = (path: string) => path.split('/').pop() ?? path;

export const pickRocoExport = async (): Promise<PickExportResult> => {
  const picked = await DocumentPicker.getDocumentAsync({
    // Android does not know the .z21 type; any file, checked after reading.
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (picked.canceled || picked.assets.length === 0) {
    return {status: 'cancelled'};
  }
  const asset = picked.assets[0];
  try {
    return {
      status: 'opened',
      opened: await openRocoExport(asset.uri),
      fileName: asset.name,
    };
  } catch {
    return {status: 'invalid'};
  }
};

export const openRocoExport = async (uri: string): Promise<OpenedExport> => {
  const bytes = await new File(uri).bytes();
  const files = unzipSync(bytes);
  const dbPath = Object.keys(files).find(
    (path) => baseName(path) === 'Loco.sqlite',
  );
  if (dbPath === undefined) {
    throw new Error('No Loco.sqlite in the file');
  }
  const images = new Map<string, Uint8Array>();
  for (const [path, content] of Object.entries(files)) {
    if (/\.(png|jpe?g)$/i.test(path)) {
      images.set(baseName(path), content);
    }
  }
  const db = await SQLite.deserializeDatabaseAsync(files[dbPath]);
  try {
    const data = await readRocoExport(db, (name) => images.has(name));
    return {
      data,
      storePhoto: async (name) => {
        const content = images.get(name);
        if (content === undefined) {
          return null;
        }
        try {
          return await storeImageBytes(content, name);
        } catch {
          return null;
        }
      },
      close: () => db.closeAsync(),
    };
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
};

// Writes the image to a temporary file in the cache, converts it to a JPEG
// like a picked photo (shrunk only if wider than PHOTO_MAX_WIDTH) and stores
// it.
const storeImageBytes = async (
  content: Uint8Array,
  name: string,
): Promise<string> => {
  const file = new File(Paths.cache, `import-${Date.now()}-${name}`);
  await file.write(content);
  try {
    const context = ImageManipulator.manipulate(file.uri);
    const original = await context.renderAsync();
    if (original.width > PHOTO_MAX_WIDTH) {
      context.resize({width: PHOTO_MAX_WIDTH});
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: PHOTO_QUALITY,
    });
    return await storeImageFile(saved.uri);
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
};
