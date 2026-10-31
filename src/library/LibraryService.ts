import {convertOffset} from '../consist/consistMath';
import {SqlDatabase} from '../db/database';
import {ConsistRepository} from '../db/consistRepository';
import {LocoRepository} from '../db/locoRepository';
import {reorderVehicles, vehicleOrder} from '../db/vehicleOrder';
import {useLibraryStore} from '../store/libraryStore';
import {
  Consist,
  ConsistDraft,
  Loco,
  LocoDraft,
  sameVehicle,
  VehicleRef,
} from './types';
import {
  ConsistProblem,
  DraftProblem,
  validateConsistDraft,
  validateDraft,
} from './validation';

// Stores loco photos as files. The app uses photos.ts; tests use a fake.
export interface PhotoStore {
  // Copies a stored photo and returns the copy's file name.
  copy(name: string): string;
  remove(name: string): void;
}

export type SaveResult<Problem = DraftProblem> =
  {ok: true; id: number} | {ok: false; problems: Problem[]};

export type SortKey = 'name' | 'address';

export type LibraryDatabase = {
  db: SqlDatabase;
  locos: LocoRepository;
  consists: ConsistRepository;
};

export const libraryDatabase = (db: SqlDatabase): LibraryDatabase => ({
  db,
  locos: new LocoRepository(db),
  consists: new ConsistRepository(db),
});

// The vehicle library (locos and consists): every change goes through here,
// is stored in SQLite and then mirrored into useLibraryStore for the screens.
export class LibraryService {
  constructor(
    private readonly database: Promise<LibraryDatabase>,
    private readonly photos: PhotoStore,
  ) {}

  async load(): Promise<void> {
    try {
      const {db, locos, consists} = await this.database;
      useLibraryStore.setState({
        locos: await locos.list(),
        consists: await consists.list(),
        order: await vehicleOrder(db),
        loaded: true,
        error: null,
      });
    } catch (error) {
      useLibraryStore.setState({loaded: true, error: String(error)});
    }
  }

  // Validates and saves a new or edited loco. A photo that the edit replaced
  // or removed is deleted afterwards. If the loco's speed-step mode changed,
  // its speed differences in consists are converted to the new mode.
  async save(draft: LocoDraft): Promise<SaveResult> {
    const problems = validateDraft(draft);
    if (problems.length > 0) {
      return {ok: false, problems};
    }
    const {locos, consists} = await this.database;
    const previous = draft.id === undefined ? null : await locos.get(draft.id);
    const id = await locos.save(draft);
    if (previous !== null && previous.speedSteps !== draft.speedSteps) {
      await consists.updateOffsets(id, (offset) =>
        convertOffset(offset, previous.speedSteps, draft.speedSteps),
      );
    }
    this.removeReplacedPhoto(previous?.photo ?? null, draft.photo);
    await this.load();
    return {ok: true, id};
  }

  async saveConsist(draft: ConsistDraft): Promise<SaveResult<ConsistProblem>> {
    const problems = validateConsistDraft(draft);
    if (problems.length > 0) {
      return {ok: false, problems};
    }
    const {consists} = await this.database;
    const previous =
      draft.id === undefined ? null : await consists.get(draft.id);
    const id = await consists.save(draft);
    this.removeReplacedPhoto(previous?.photo ?? null, draft.photo);
    await this.load();
    return {ok: true, id};
  }

  // Copies a loco with its functions and its own copy of the photo. The copy
  // goes to the end of the list. Returns the new id.
  async duplicate(id: number, copyName: (name: string) => string) {
    const {locos} = await this.database;
    const original = await locos.get(id);
    if (original === null) {
      return null;
    }
    const {id: _id, ...rest} = original;
    const copyId = await locos.save({
      ...rest,
      name: copyName(original.name),
      photo: original.photo === null ? null : this.photos.copy(original.photo),
    });
    await this.load();
    return copyId;
  }

  // Deletes a loco; it also leaves every consist it was in.
  async remove(id: number): Promise<void> {
    const {locos} = await this.database;
    const loco = await locos.get(id);
    await locos.remove(id);
    if (loco?.photo) {
      this.photos.remove(loco.photo);
    }
    await this.load();
  }

  // Deletes a consist; its locos stay in the library.
  async removeConsist(id: number): Promise<void> {
    const {consists} = await this.database;
    const consist = await consists.get(id);
    await consists.remove(id);
    if (consist?.photo) {
      this.photos.remove(consist.photo);
    }
    await this.load();
  }

  // Moves an entry one place up (-1) or down (+1) in the list.
  async move(ref: VehicleRef, direction: -1 | 1): Promise<void> {
    const order = [...useLibraryStore.getState().order];
    const index = order.findIndex((entry) => sameVehicle(entry, ref));
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) {
      return;
    }
    [order[index], order[target]] = [order[target], order[index]];
    await reorderVehicles((await this.database).db, order);
    await this.load();
  }

  // Re-orders the whole list by name or address (a one-off action; the user
  // can still move entries afterwards). Consists sort by their lead loco's
  // address.
  async sortBy(key: SortKey): Promise<void> {
    const {locos, consists, order} = useLibraryStore.getState();
    const name = (ref: VehicleRef) =>
      (ref.kind === 'loco'
        ? locos.find((loco) => loco.id === ref.id)?.name
        : consists.find((consist) => consist.id === ref.id)?.name) ?? '';
    const address = (ref: VehicleRef) =>
      ref.kind === 'loco'
        ? (locos.find((loco) => loco.id === ref.id)?.address ?? 0)
        : leadAddress(
            consists.find((consist) => consist.id === ref.id),
            locos,
          );
    const sorted = [...order].sort(
      key === 'name'
        ? (a, b) =>
            name(a).localeCompare(name(b), undefined, {sensitivity: 'base'})
        : (a, b) => address(a) - address(b),
    );
    await reorderVehicles((await this.database).db, sorted);
    await this.load();
  }

  private removeReplacedPhoto(previous: string | null, next: string | null) {
    if (previous !== null && previous !== next) {
      this.photos.remove(previous);
    }
  }
}

const leadAddress = (consist: Consist | undefined, locos: Loco[]): number => {
  const lead = consist?.members[0];
  return lead === undefined
    ? Number.MAX_SAFE_INTEGER
    : (locos.find((loco) => loco.id === lead.locoId)?.address ??
        Number.MAX_SAFE_INTEGER);
};
