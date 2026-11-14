import {defaultFunctions} from '../../library/functionSlots';
import {emptyDetails, LocoDraft} from '../../library/types';
import {ConsistRepository} from '../consistRepository';
import {LocoRepository} from '../locoRepository';
import {migrate} from '../migrations';
import {openTestDatabase} from '../testUtils/nodeSqlite';
import {reorderVehicles, vehicleOrder} from '../vehicleOrder';

const loco = (name: string, address: number): LocoDraft => ({
  name,
  address,
  speedSteps: 128,
  maxSpeed: 200,
  speedDisplay: 'kmh',
  acceleration: 5,
  photo: null,
  notes: '',
  details: emptyDetails(),
  functions: defaultFunctions(1),
});

const setup = async () => {
  const db = openTestDatabase();
  await migrate(db);
  const locos = new LocoRepository(db);
  const consists = new ConsistRepository(db);
  const a = await locos.save(loco('Vectron 6503', 6503));
  const b = await locos.save(loco('Vectron 6519', 6519));
  return {db, locos, consists, a, b};
};

describe('ConsistRepository', () => {
  it('stores members in train order with direction and offset', async () => {
    const {consists, a, b} = await setup();
    const id = await consists.save({
      name: 'Double vectron',
      photo: 'p.jpg',
      members: [
        {locoId: b, reversed: true, speedOffset: -3},
        {locoId: a, reversed: false, speedOffset: 0},
      ],
    });
    expect(await consists.get(id)).toEqual({
      id,
      name: 'Double vectron',
      photo: 'p.jpg',
      members: [
        {locoId: b, reversed: true, speedOffset: -3},
        {locoId: a, reversed: false, speedOffset: 0},
      ],
    });
    expect(await consists.list()).toHaveLength(1);
  });

  it('replaces the members on update', async () => {
    const {consists, a, b} = await setup();
    const id = await consists.save({
      name: 'Pair',
      photo: null,
      members: [
        {locoId: a, reversed: false, speedOffset: 0},
        {locoId: b, reversed: false, speedOffset: 0},
      ],
    });
    await consists.save({
      id,
      name: 'Single',
      photo: null,
      members: [{locoId: b, reversed: false, speedOffset: 2}],
    });
    expect((await consists.get(id))?.members).toEqual([
      {locoId: b, reversed: false, speedOffset: 2},
    ]);
  });

  it('drops a deleted loco from its consists', async () => {
    const {locos, consists, a, b} = await setup();
    const id = await consists.save({
      name: 'Pair',
      photo: null,
      members: [
        {locoId: a, reversed: false, speedOffset: 0},
        {locoId: b, reversed: false, speedOffset: 0},
      ],
    });
    await locos.remove(a);
    expect((await consists.get(id))?.members.map((m) => m.locoId)).toEqual([b]);
  });

  it('converts a loco’s offsets in every consist', async () => {
    const {consists, a} = await setup();
    const id = await consists.save({
      name: 'One',
      photo: null,
      members: [{locoId: a, reversed: false, speedOffset: 4}],
    });
    await consists.updateOffsets(a, (offset) => offset * 2);
    expect((await consists.get(id))?.members[0].speedOffset).toBe(8);
  });
});

describe('vehicle order', () => {
  it('lists locos and consists in one order', async () => {
    const {db, consists, a, b} = await setup();
    const c = await consists.save({name: 'C', photo: null, members: []});
    expect(await vehicleOrder(db)).toEqual([
      {kind: 'loco', id: a},
      {kind: 'loco', id: b},
      {kind: 'consist', id: c},
    ]);
    await reorderVehicles(db, [
      {kind: 'consist', id: c},
      {kind: 'loco', id: b},
      {kind: 'loco', id: a},
    ]);
    expect(await vehicleOrder(db)).toEqual([
      {kind: 'consist', id: c},
      {kind: 'loco', id: b},
      {kind: 'loco', id: a},
    ]);
  });
});
