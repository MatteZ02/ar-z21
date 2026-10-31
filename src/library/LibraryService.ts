import {LocoRepository} from '../db/locoRepository';
import {useLibraryStore} from '../store/libraryStore';
import {Loco, LocoDraft} from './types';
import {DraftProblem, validateDraft} from './validation';

// Stores loco photos as files. The app uses photos.ts; tests use a fake.
export interface PhotoStore {
  // Copies a stored photo and returns the copy's file name.
  copy(name: string): string;
  remove(name: string): void;
}

export type SaveResult =
  {ok: true; id: number} | {ok: false; problems: DraftProblem[]};

export type SortKey = 'name' | 'address';

// The loco library: every change goes through here, is stored in SQLite and
// then mirrored into useLibraryStore for the screens.
export class LibraryService {
  constructor(
    private readonly repository: Promise<LocoRepository>,
    private readonly photos: PhotoStore,
  ) {}

  async load(): Promise<void> {
    try {
      const locos = await (await this.repository).list();
      useLibraryStore.setState({locos, loaded: true, error: null});
    } catch (error) {
      useLibraryStore.setState({loaded: true, error: String(error)});
    }
  }

  // Validates and saves a new or edited loco. A photo that the edit replaced
  // or removed is deleted afterwards.
  async save(draft: LocoDraft): Promise<SaveResult> {
    const problems = validateDraft(draft);
    if (problems.length > 0) {
      return {ok: false, problems};
    }
    const repository = await this.repository;
    const previous =
      draft.id === undefined ? null : await repository.get(draft.id);
    const id = await repository.save(draft);
    if (previous?.photo && previous.photo !== draft.photo) {
      this.photos.remove(previous.photo);
    }
    await this.load();
    return {ok: true, id};
  }

  // Copies a loco with its functions and its own copy of the photo. The copy
  // goes to the end of the list. Returns the new id.
  async duplicate(id: number, copyName: (name: string) => string) {
    const repository = await this.repository;
    const original = await repository.get(id);
    if (original === null) {
      return null;
    }
    const {id: _id, ...rest} = original;
    const copyId = await repository.save({
      ...rest,
      name: copyName(original.name),
      photo: original.photo === null ? null : this.photos.copy(original.photo),
    });
    await this.load();
    return copyId;
  }

  async remove(id: number): Promise<void> {
    const repository = await this.repository;
    const loco = await repository.get(id);
    await repository.remove(id);
    if (loco?.photo) {
      this.photos.remove(loco.photo);
    }
    await this.load();
  }

  // Moves a loco one place up (-1) or down (+1) in the list.
  async move(id: number, direction: -1 | 1): Promise<void> {
    const ids = useLibraryStore.getState().locos.map((loco) => loco.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) {
      return;
    }
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await (await this.repository).reorder(ids);
    await this.load();
  }

  // Re-orders the whole library by name or address (a one-off action; the
  // user can still move locos afterwards).
  async sortBy(key: SortKey): Promise<void> {
    const sorted = [...useLibraryStore.getState().locos].sort(
      key === 'name'
        ? (a: Loco, b: Loco) =>
            a.name.localeCompare(b.name, undefined, {sensitivity: 'base'})
        : (a: Loco, b: Loco) => a.address - b.address,
    );
    await (await this.repository).reorder(sorted.map((loco) => loco.id));
    await this.load();
  }
}
