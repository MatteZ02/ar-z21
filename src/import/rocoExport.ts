import {SqlDatabase} from '../db/database';
import {MAX_FUNCTION_NUMBER, MAX_SLOTS} from '../library/functionSlots';
import {LocoFunction, SpeedDisplay} from '../library/types';
import {isValidLocoAddress} from '../protocol';
import {iconForRoco, isKnownRocoIcon} from './rocoIcons';

// Reading a Roco Z21 app export (format: docs/z21-export-format.md). Pure
// logic: the caller unzips the file and opens Loco.sqlite as an SqlDatabase.

export type ImportedLoco = {
  // vehicles.id in the export.
  sourceId: number;
  name: string;
  address: number;
  maxSpeed: number;
  speedDisplay: SpeedDisplay;
  // File name of the photo inside the export, or null.
  photo: string | null;
  notes: string;
  details: {
    fullName: string;
    railway: string;
    articleNumber: string;
    decoderType: string;
    buildYear: string;
  };
  functions: LocoFunction[];
  // A Roco wagon (control car etc.) imported as a loco (decided by the user).
  wasWagon: boolean;
};

export type ImportedConsist = {
  sourceId: number;
  name: string;
  photo: string | null;
  // Train order; sourceIds of ImportedLocos.
  members: {sourceId: number; reversed: boolean}[];
};

// Something that could not be imported, for the report shown afterwards.
export type ImportIssue =
  | {kind: 'invalidAddress'; name: string; address: number | null}
  | {kind: 'unsupportedType'; name: string; type: number}
  | {kind: 'missingPhoto'; name: string; photo: string}
  | {kind: 'unknownIcon'; name: string; icon: string}
  | {kind: 'functionSkipped'; name: string; number: number}
  | {kind: 'missingMember'; name: string};

export type RocoExport = {
  locos: ImportedLoco[];
  consists: ImportedConsist[];
  issues: ImportIssue[];
};

type VehicleRow = {
  id: number;
  name: string | null;
  image_name: string | null;
  type: number | null;
  max_speed: number | null;
  address: number | null;
  position: number | null;
  speed_display: number | null;
  traction_direction: number | null;
  full_name: string | null;
  railway: string | null;
  article_number: string | null;
  decoder_type: string | null;
  build_year: string | null;
  description: string | null;
};

type FunctionRow = {
  vehicle_id: number;
  function: number | null;
  position: number | null;
  button_type: number | null;
  image_name: string | null;
  shortcut: string | null;
};

type TrainRow = {train_id: number; vehicle_id: number; position: number | null};

// Roco vehicle types.
const TYPE_LOCO = 0;
const TYPE_WAGON = 1;
const TYPE_TRAIN = 3;

const DEFAULT_MAX_SPEED = 100;
const MAX_IMPORTED_SPEED = 500;

const text = (value: string | null | undefined): string => (value ?? '').trim();

const speedDisplay = (value: number | null): SpeedDisplay =>
  value === 1 ? 'step' : value === 2 ? 'mph' : 'kmh';

// The columns that matter; any of them may be missing in other app versions,
// so read what exists and default the rest.
const columns = async (db: SqlDatabase, table: string) =>
  new Set(
    (await db.getAllAsync<{name: string}>(`PRAGMA table_info('${table}')`)).map(
      (column) => column.name,
    ),
  );

const select = (available: Set<string>, wanted: string[]) =>
  wanted
    .map((name) => (available.has(name) ? `"${name}"` : `NULL AS "${name}"`))
    .join(', ');

// Reads locos, wagons and consists. `photoExists` tells whether an image file
// named in the database is present in the export.
export const readRocoExport = async (
  db: SqlDatabase,
  photoExists: (name: string) => boolean,
): Promise<RocoExport> => {
  const issues: ImportIssue[] = [];
  const tables = new Set(
    (
      await db.getAllAsync<{name: string}>(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      )
    ).map((table) => table.name),
  );
  if (!tables.has('vehicles')) {
    throw new Error('Not a Z21 export: no vehicles table');
  }

  const vehicleColumns = await columns(db, 'vehicles');
  const vehicles = await db.getAllAsync<VehicleRow>(
    `SELECT ${select(vehicleColumns, [
      'id',
      'name',
      'image_name',
      'type',
      'max_speed',
      'address',
      'position',
      'speed_display',
      'traction_direction',
      'full_name',
      'railway',
      'article_number',
      'decoder_type',
      'build_year',
      'description',
    ])} FROM vehicles ORDER BY position, id`,
  );

  const functionRows = tables.has('functions')
    ? await db.getAllAsync<FunctionRow>(
        `SELECT ${select(await columns(db, 'functions'), [
          'vehicle_id',
          'function',
          'position',
          'button_type',
          'image_name',
          'shortcut',
        ])} FROM functions ORDER BY vehicle_id, position`,
      )
    : [];
  const trainRows = tables.has('train_list')
    ? await db.getAllAsync<TrainRow>(
        'SELECT train_id, vehicle_id, position FROM train_list ORDER BY train_id, position',
      )
    : [];

  const photoOf = (name: string, file: string | null): string | null => {
    const photo = text(file);
    if (photo === '') {
      return null;
    }
    if (!photoExists(photo)) {
      issues.push({kind: 'missingPhoto', name, photo});
      return null;
    }
    return photo;
  };

  const functionsOf = (vehicleId: number, name: string): LocoFunction[] => {
    const result: LocoFunction[] = [];
    const usedNumbers = new Set<number>();
    const usedSlots = new Set<number>();
    for (const row of functionRows) {
      if (row.vehicle_id !== vehicleId) {
        continue;
      }
      const number = row.function ?? -1;
      const slot = row.position ?? -1;
      if (
        !Number.isInteger(number) ||
        number < 0 ||
        number > MAX_FUNCTION_NUMBER ||
        usedNumbers.has(number) ||
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= MAX_SLOTS ||
        usedSlots.has(slot)
      ) {
        issues.push({kind: 'functionSkipped', name, number});
        continue;
      }
      if (!isKnownRocoIcon(row.image_name)) {
        issues.push({kind: 'unknownIcon', name, icon: text(row.image_name)});
      }
      usedNumbers.add(number);
      usedSlots.add(slot);
      result.push({
        number,
        name: text(row.shortcut),
        icon: iconForRoco(row.image_name),
        momentary: row.button_type === 1,
        slot,
      });
    }
    return result.sort((a, b) => a.slot - b.slot);
  };

  const locos: ImportedLoco[] = [];
  const consistRows: VehicleRow[] = [];
  const reversedById = new Map<number, boolean>();

  for (const row of vehicles) {
    const name = text(row.name) || `#${row.address ?? row.id}`;
    const type = row.type ?? TYPE_LOCO;
    reversedById.set(row.id, row.traction_direction === 1);
    if (type === TYPE_TRAIN) {
      consistRows.push(row);
      continue;
    }
    if (type !== TYPE_LOCO && type !== TYPE_WAGON) {
      issues.push({kind: 'unsupportedType', name, type});
      continue;
    }
    if (row.address === null || !isValidLocoAddress(row.address)) {
      issues.push({kind: 'invalidAddress', name, address: row.address});
      continue;
    }
    const maxSpeed =
      row.max_speed !== null &&
      Number.isInteger(row.max_speed) &&
      row.max_speed >= 1 &&
      row.max_speed <= MAX_IMPORTED_SPEED
        ? row.max_speed
        : DEFAULT_MAX_SPEED;
    locos.push({
      sourceId: row.id,
      name,
      address: row.address,
      maxSpeed,
      speedDisplay: speedDisplay(row.speed_display),
      photo: photoOf(name, row.image_name),
      notes: text(row.description),
      details: {
        fullName: text(row.full_name),
        railway: text(row.railway),
        articleNumber: text(row.article_number),
        decoderType: text(row.decoder_type),
        buildYear: text(row.build_year),
      },
      functions: functionsOf(row.id, name),
      wasWagon: type === TYPE_WAGON,
    });
  }

  const importedIds = new Set(locos.map((loco) => loco.sourceId));
  const consists: ImportedConsist[] = consistRows.map((row) => {
    const name = text(row.name) || `#${row.id}`;
    const members = trainRows
      .filter((train) => train.train_id === row.id)
      .flatMap((train) => {
        if (!importedIds.has(train.vehicle_id)) {
          issues.push({kind: 'missingMember', name});
          return [];
        }
        return [
          {
            sourceId: train.vehicle_id,
            // Roco stores "driving direction inverted" on the loco; here it
            // becomes the member setting (decided by the user).
            reversed: reversedById.get(train.vehicle_id) ?? false,
          },
        ];
      });
    return {
      sourceId: row.id,
      name,
      photo: photoOf(name, row.image_name),
      members,
    };
  });

  return {locos, consists, issues};
};
