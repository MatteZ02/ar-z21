import {defaultFunctions} from '../../library/functionSlots';
import {
  DEFAULT_ACCELERATION,
  emptyDetails,
  LocoDraft,
} from '../../library/types';
import {SqlDatabase} from '../database';
import {LocoRepository} from '../locoRepository';
import {MIGRATIONS, migrate, SCHEMA_VERSION} from '../migrations';
import {openTestDatabase} from '../testUtils/nodeSqlite';
import {reorderVehicles} from '../vehicleOrder';

const draft = (overrides: Partial<LocoDraft> = {}): LocoDraft => ({
  name: 'SBB Vectron',
  address: 6503,
  speedSteps: 128,
  maxSpeed: 200,
  speedDisplay: 'kmh',
  acceleration: 3.5,
  photo: null,
  notes: '',
  details: emptyDetails(),
  functions: defaultFunctions(3),
  ...overrides,
});

const setup = async () => {
  const db = openTestDatabase();
  await migrate(db);
  return {db, repo: new LocoRepository(db)};
};

describe('migrations', () => {
  it('creates the schema and records the version', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const row = await db.getFirstAsync<{user_version: number}>(
      'PRAGMA user_version',
    );
    expect(row?.user_version).toBe(SCHEMA_VERSION);
  });

  it('can run again without changes', async () => {
    const db = openTestDatabase();
    await migrate(db);
    await expect(migrate(db)).resolves.toBeUndefined();
  });

  it('gives locos from before version 3 the default acceleration', async () => {
    const db = openTestDatabase();
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[0] + MIGRATIONS[1]);
      await db.execAsync('PRAGMA user_version = 2;');
    });
    await db.runAsync(
      "INSERT INTO locos (name, address, position) VALUES ('Old', 3, 0)",
    );
    await migrate(db);
    const locos = await new LocoRepository(db).list();
    expect(locos[0].acceleration).toBe(DEFAULT_ACCELERATION);
  });

  it('refuses a database from a newer app version', async () => {
    const db: SqlDatabase = openTestDatabase();
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION + 1};`);
    await expect(migrate(db)).rejects.toThrow('newer');
  });
});

describe('LocoRepository', () => {
  it('stores and reads back a loco with its functions', async () => {
    const {repo} = await setup();
    const id = await repo.save(
      draft({
        notes: 'Bought 2021',
        details: {...emptyDetails(), railway: 'SBB', articleNumber: '71950'},
        functions: [
          {number: 0, name: '', icon: 'light', momentary: false, slot: 0},
          {number: 2, name: 'Horn', icon: 'horn', momentary: true, slot: 9},
        ],
      }),
    );
    const loco = await repo.get(id);
    expect(loco).toMatchObject({
      id,
      name: 'SBB Vectron',
      address: 6503,
      speedSteps: 128,
      maxSpeed: 200,
      speedDisplay: 'kmh',
      acceleration: 3.5,
      notes: 'Bought 2021',
      details: {railway: 'SBB', articleNumber: '71950'},
    });
    expect(loco?.functions).toEqual([
      {number: 0, name: '', icon: 'light', momentary: false, slot: 0},
      {number: 2, name: 'Horn', icon: 'horn', momentary: true, slot: 9},
    ]);
  });

  it('appends new locos and lists them in order', async () => {
    const {db, repo} = await setup();
    const a = await repo.save(draft({name: 'A', address: 1}));
    const b = await repo.save(draft({name: 'B', address: 2}));
    const c = await repo.save(draft({name: 'C', address: 3}));
    expect((await repo.list()).map((loco) => loco.id)).toEqual([a, b, c]);

    await reorderVehicles(db, [
      {kind: 'loco', id: c},
      {kind: 'loco', id: a},
      {kind: 'loco', id: b},
    ]);
    expect((await repo.list()).map((loco) => loco.name)).toEqual([
      'C',
      'A',
      'B',
    ]);
  });

  it('updates a loco and replaces its functions', async () => {
    const {repo} = await setup();
    const id = await repo.save(draft());
    const saved = await repo.get(id);
    await repo.save({
      ...saved!,
      name: '  Renamed  ',
      speedSteps: 28,
      functions: [
        {number: 5, name: '', icon: 'none', momentary: false, slot: 0},
      ],
    });
    const loco = await repo.get(id);
    expect(loco?.name).toBe('Renamed');
    expect(loco?.speedSteps).toBe(28);
    expect(loco?.functions.map((fn) => fn.number)).toEqual([5]);
    expect(await repo.list()).toHaveLength(1);
  });

  it('deletes a loco with its functions', async () => {
    const {db, repo} = await setup();
    const id = await repo.save(draft());
    await repo.remove(id);
    expect(await repo.get(id)).toBeNull();
    const left = await db.getAllAsync('SELECT * FROM loco_functions');
    expect(left).toEqual([]);
  });

  it('rolls back a failed save completely', async () => {
    const {repo} = await setup();
    const duplicateNumbers = draft({
      functions: [
        {number: 1, name: '', icon: 'none', momentary: false, slot: 0},
        {number: 1, name: '', icon: 'none', momentary: false, slot: 1},
      ],
    });
    await expect(repo.save(duplicateNumbers)).rejects.toThrow();
    expect(await repo.list()).toEqual([]);
  });
});
