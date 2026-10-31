/// <reference types="node" />
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {unzipSync} from 'fflate';
import {SqlDatabase} from '../../db/database';
import {migrate} from '../../db/migrations';
import {openTestDatabase} from '../../db/testUtils/nodeSqlite';
import {libraryDatabase, LibraryService} from '../../library/LibraryService';
import {useLibraryStore} from '../../store/libraryStore';
import {applyImport} from '../applyImport';
import {
  makeImportPlan,
  summarize,
  withChoice,
  withChoiceForAll,
} from '../importPlan';
import {iconForRoco} from '../rocoIcons';
import {readRocoExport} from '../rocoExport';

// The user's real Roco export. It is not committed to the repository, so the
// tests that need it are skipped where it is missing (e.g. in CI).
const SAMPLE = join(__dirname, '../../../docs/reference/z21_layout_import.z21');
const describeSample = existsSync(SAMPLE) ? describe : describe.skip;

// Opens the export's Loco.sqlite with node:sqlite, read-only.
const openSample = () => {
  const files = unzipSync(new Uint8Array(readFileSync(SAMPLE)));
  const dbName = Object.keys(files).find((name) =>
    name.endsWith('Loco.sqlite'),
  );
  if (dbName === undefined) {
    throw new Error('No Loco.sqlite in the sample');
  }
  const dir = mkdtempSync(join(tmpdir(), 'z21-'));
  const path = join(dir, 'Loco.sqlite');
  writeFileSync(path, files[dbName]);
  const raw = new DatabaseSync(path, {readOnly: true});
  const db: SqlDatabase = {
    execAsync: async () => {
      throw new Error('read only');
    },
    runAsync: async () => {
      throw new Error('read only');
    },
    getAllAsync: async <T>(source: string) => raw.prepare(source).all() as T[],
    getFirstAsync: async <T>(source: string) =>
      (raw.prepare(source).get() as T | undefined) ?? null,
    withTransactionAsync: async (task) => {
      await task();
    },
  };
  const photos = new Set(
    Object.keys(files)
      .filter((name) => name.endsWith('.png'))
      .map((name) => name.split('/').pop() ?? ''),
  );
  return {
    db,
    photos,
    close: () => {
      raw.close();
      rmSync(dir, {recursive: true, force: true});
    },
  };
};

describeSample('reading the sample Roco export', () => {
  const read = async () => {
    const sample = openSample();
    try {
      return await readRocoExport(sample.db, (name) => sample.photos.has(name));
    } finally {
      sample.close();
    }
  };

  it('finds the locos, wagons and the consist', async () => {
    const data = await read();
    // 82 vehicles: 78 locos, 3 wagons, 1 train.
    expect(data.locos).toHaveLength(81);
    expect(data.locos.filter((loco) => loco.wasWagon)).toHaveLength(3);
    expect(data.consists).toHaveLength(1);
  });

  it('reads a loco like the Roco app shows it', async () => {
    const data = await read();
    const lugano = data.locos.find((loco) => loco.address === 6503);
    expect(lugano).toMatchObject({
      name: 'SBB Vectron ”Lago di Lugano”',
      maxSpeed: 200,
      speedDisplay: 'kmh',
      photo: '1849B6F3-E90D-49B2-8EF1-C0F605B9AE12.png',
    });
    // driving_phone.PNG: F0 headlight in slot 0, F27 "Tunnelmode" in slot 5,
    // F2 a momentary horn in slot 9.
    const fn = (number: number) =>
      lugano?.functions.find((entry) => entry.number === number);
    expect(fn(0)).toMatchObject({slot: 0, icon: 'headlight', momentary: false});
    expect(fn(27)).toMatchObject({slot: 5, name: 'Tunnelmode', icon: 'mute'});
    expect(fn(2)).toMatchObject({slot: 9, icon: 'horn', momentary: true});
  });

  it('reads the consist with its members in order', async () => {
    const data = await read();
    const consist = data.consists[0];
    expect(consist.name).toBe('Double vectron');
    const addresses = consist.members.map(
      (member) =>
        data.locos.find((loco) => loco.sourceId === member.sourceId)?.address,
    );
    expect(addresses).toEqual([6503, 6519]);
    // 6519 has "driving direction inverted" in the Roco app.
    expect(consist.members.map((member) => member.reversed)).toEqual([
      false,
      true,
    ]);
  });

  it('knows every icon in the sample', async () => {
    const data = await read();
    expect(data.issues.filter((issue) => issue.kind === 'unknownIcon')).toEqual(
      [],
    );
  });
});

describe('import plan and applying it', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      loaded: false,
      error: null,
      locos: [],
      consists: [],
      order: [],
    });
  });

  const exported = (sourceId: number, address: number) => ({
    sourceId,
    name: `Export ${address}`,
    address,
    maxSpeed: 160,
    speedDisplay: 'kmh' as const,
    photo: `${address}.png`,
    notes: '',
    details: {
      fullName: '',
      railway: '',
      articleNumber: '',
      decoderType: '',
      buildYear: '',
    },
    functions: [
      {number: 0, name: '', icon: 'light', momentary: false, slot: 0},
    ],
    wasWagon: false,
  });

  const setup = async () => {
    const db = openTestDatabase();
    await migrate(db);
    const service = new LibraryService(Promise.resolve(libraryDatabase(db)), {
      copy: (name) => name,
      remove: () => undefined,
    });
    await service.load();
    const existing = await service.save({
      name: 'Mine',
      address: 3,
      speedSteps: 28,
      maxSpeed: 100,
      speedDisplay: 'step',
      photo: null,
      notes: '',
      details: exported(0, 0).details,
      functions: [],
    });
    const data = {
      locos: [exported(1, 3), exported(2, 4)],
      consists: [
        {
          sourceId: 9,
          name: 'Pair',
          photo: null,
          members: [
            {sourceId: 1, reversed: false},
            {sourceId: 2, reversed: true},
          ],
        },
      ],
      issues: [],
    };
    const stored: string[] = [];
    const storePhoto = async (name: string) => {
      stored.push(name);
      return `stored-${name}`;
    };
    const state = () => useLibraryStore.getState();
    return {service, existing, data, storePhoto, stored, state};
  };

  it('finds address clashes and lets the user choose per loco', async () => {
    const {data, state} = await setup();
    const plan = makeImportPlan(data, state().locos);
    expect(plan.locos.map((entry) => entry.choice)).toEqual([
      'skip',
      'keepBoth',
    ]);
    expect(summarize(plan)).toEqual({
      added: 1,
      replaced: 0,
      skipped: 1,
      consists: 1,
    });
    const replaced = withChoice(plan, 1, 'replace');
    expect(summarize(replaced).replaced).toBe(1);
    // Locos without a clash cannot be skipped by "for all".
    expect(summarize(withChoiceForAll(plan, 'skip')).added).toBe(1);
  });

  it('skips a duplicate but still builds the consist with the library loco', async () => {
    const {service, existing, data, storePhoto, stored, state} = await setup();
    const plan = makeImportPlan(data, state().locos, 'skip');
    const result = await applyImport(plan, service, storePhoto);
    expect(result).toEqual({
      added: 1,
      replaced: 0,
      skipped: 1,
      consists: 1,
      failed: [],
    });
    expect(state().locos.map((loco) => loco.name)).toEqual([
      'Mine',
      'Export 4',
    ]);
    expect(stored).toEqual(['4.png']);
    const members = state().consists[0].members;
    expect(members[0].locoId).toBe(existing.ok && existing.id);
    expect(members[1]).toMatchObject({reversed: true, speedOffset: 0});
  });

  it('replaces a duplicate, keeping its speed steps', async () => {
    const {service, data, storePhoto, state} = await setup();
    const plan = withChoice(makeImportPlan(data, state().locos), 1, 'replace');
    await applyImport(plan, service, storePhoto);
    const loco = state().locos.find((entry) => entry.address === 3);
    expect(loco).toMatchObject({
      name: 'Export 3',
      speedSteps: 28,
      maxSpeed: 160,
      photo: 'stored-3.png',
    });
    expect(state().locos).toHaveLength(2);
  });

  it('keeps both when asked, with 128 steps for new locos', async () => {
    const {service, data, storePhoto, state} = await setup();
    const plan = withChoiceForAll(
      makeImportPlan(data, state().locos),
      'keepBoth',
    );
    await applyImport(plan, service, storePhoto);
    expect(state().locos.filter((loco) => loco.address === 3)).toHaveLength(2);
    expect(
      state().locos.find((loco) => loco.name === 'Export 4')?.speedSteps,
    ).toBe(128);
  });
});

describe('Roco icon names', () => {
  it('maps to the app’s own icons with a fallback', () => {
    expect(iconForRoco('horn_high')).toBe('horn');
    expect(iconForRoco('main_beam')).toBe('headlight');
    expect(iconForRoco('empty')).toBe('none');
    expect(iconForRoco('something_new')).toBe('none');
    expect(iconForRoco(null)).toBe('none');
  });
});
