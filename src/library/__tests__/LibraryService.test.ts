import {LocoRepository} from '../../db/locoRepository';
import {migrate} from '../../db/migrations';
import {openTestDatabase} from '../../db/testUtils/nodeSqlite';
import {useLibraryStore} from '../../store/libraryStore';
import {defaultFunctions} from '../functionSlots';
import {LibraryService, PhotoStore} from '../LibraryService';
import {emptyDetails, LocoDraft} from '../types';

const draft = (overrides: Partial<LocoDraft> = {}): LocoDraft => ({
  name: 'Vectron',
  address: 6503,
  speedSteps: 128,
  maxSpeed: 200,
  speedDisplay: 'kmh',
  photo: null,
  notes: '',
  details: emptyDetails(),
  functions: defaultFunctions(2),
  ...overrides,
});

const setup = async () => {
  const db = openTestDatabase();
  await migrate(db);
  const removed: string[] = [];
  let copies = 0;
  const photos: PhotoStore = {
    copy: (name) => `${name}-copy${++copies}`,
    remove: (name) => {
      removed.push(name);
    },
  };
  const service = new LibraryService(
    Promise.resolve(new LocoRepository(db)),
    photos,
  );
  await service.load();
  const locos = () => useLibraryStore.getState().locos;
  return {service, removed, locos};
};

describe('LibraryService', () => {
  beforeEach(() => {
    useLibraryStore.setState({loaded: false, error: null, locos: []});
  });

  it('loads into the store', async () => {
    const {locos} = await setup();
    expect(useLibraryStore.getState().loaded).toBe(true);
    expect(locos()).toEqual([]);
  });

  it('validates before saving', async () => {
    const {service, locos} = await setup();
    const result = await service.save(draft({name: '', address: 0}));
    expect(result).toEqual({
      ok: false,
      problems: ['nameMissing', 'addressInvalid'],
    });
    expect(locos()).toEqual([]);
  });

  it('saves and lists', async () => {
    const {service, locos} = await setup();
    const result = await service.save(draft());
    expect(result.ok).toBe(true);
    expect(locos().map((loco) => loco.name)).toEqual(['Vectron']);
  });

  it('deletes a replaced or removed photo after saving', async () => {
    const {service, removed, locos} = await setup();
    await service.save(draft({photo: 'old.jpg'}));
    const saved = locos()[0];
    await service.save({...saved, photo: 'new.jpg'});
    expect(removed).toEqual(['old.jpg']);
    await service.save({...locos()[0], photo: null});
    expect(removed).toEqual(['old.jpg', 'new.jpg']);
  });

  it('duplicates a loco with its own photo copy', async () => {
    const {service, locos} = await setup();
    await service.save(draft({photo: 'a.jpg'}));
    const id = locos()[0].id;
    const copyId = await service.duplicate(id, (name) => `${name} (copy)`);
    expect(locos().map((loco) => [loco.name, loco.photo])).toEqual([
      ['Vectron', 'a.jpg'],
      ['Vectron (copy)', 'a.jpg-copy1'],
    ]);
    expect(locos()[1].id).toBe(copyId);
    expect(locos()[1].functions).toEqual(locos()[0].functions);
  });

  it('deletes a loco and its photo', async () => {
    const {service, removed, locos} = await setup();
    await service.save(draft({photo: 'a.jpg'}));
    await service.remove(locos()[0].id);
    expect(locos()).toEqual([]);
    expect(removed).toEqual(['a.jpg']);
  });

  it('moves locos up and down, and sorts', async () => {
    const {service, locos} = await setup();
    await service.save(draft({name: 'b', address: 30}));
    await service.save(draft({name: 'C', address: 10}));
    await service.save(draft({name: 'a', address: 20}));
    const names = () => locos().map((loco) => loco.name);

    await service.move(locos()[2].id, -1);
    expect(names()).toEqual(['b', 'a', 'C']);
    await service.move(locos()[0].id, -1);
    expect(names()).toEqual(['b', 'a', 'C']);

    await service.sortBy('name');
    expect(names()).toEqual(['a', 'b', 'C']);
    await service.sortBy('address');
    expect(names()).toEqual(['C', 'a', 'b']);
  });
});
