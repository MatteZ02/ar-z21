import {Consist, ConsistDraft, ConsistMember} from '../library/types';
import {SqlDatabase} from './database';
import {nextPosition} from './vehicleOrder';

type ConsistRow = {id: number; name: string; photo: string | null};

type MemberRow = {
  consist_id: number;
  loco_id: number;
  reversed: number;
  speed_offset: number;
};

const toMember = (row: MemberRow): ConsistMember => ({
  locoId: row.loco_id,
  reversed: row.reversed !== 0,
  speedOffset: row.speed_offset,
});

// Plain SQL access to consists. Members are deleted with their loco
// (ON DELETE CASCADE); callers validate drafts first.
export class ConsistRepository {
  constructor(private readonly db: SqlDatabase) {}

  async list(): Promise<Consist[]> {
    const rows = await this.db.getAllAsync<ConsistRow>(
      'SELECT id, name, photo FROM consists ORDER BY position, id',
    );
    const memberRows = await this.db.getAllAsync<MemberRow>(
      'SELECT * FROM consist_members ORDER BY consist_id, position',
    );
    const byConsist = new Map<number, ConsistMember[]>();
    for (const row of memberRows) {
      const members = byConsist.get(row.consist_id) ?? [];
      members.push(toMember(row));
      byConsist.set(row.consist_id, members);
    }
    return rows.map((row) => ({...row, members: byConsist.get(row.id) ?? []}));
  }

  async get(id: number): Promise<Consist | null> {
    const row = await this.db.getFirstAsync<ConsistRow>(
      'SELECT id, name, photo FROM consists WHERE id = ?',
      id,
    );
    if (row === null) {
      return null;
    }
    const members = await this.db.getAllAsync<MemberRow>(
      'SELECT * FROM consist_members WHERE consist_id = ? ORDER BY position',
      id,
    );
    return {...row, members: members.map(toMember)};
  }

  // Inserts (at the end of the list) or updates, replacing the members.
  async save(draft: ConsistDraft): Promise<number> {
    let id = draft.id;
    await this.db.withTransactionAsync(async () => {
      if (id === undefined) {
        const result = await this.db.runAsync(
          'INSERT INTO consists (name, photo, position) VALUES (?, ?, ?)',
          draft.name.trim(),
          draft.photo,
          await nextPosition(this.db),
        );
        id = result.lastInsertRowId;
      } else {
        await this.db.runAsync(
          'UPDATE consists SET name = ?, photo = ? WHERE id = ?',
          draft.name.trim(),
          draft.photo,
          id,
        );
        await this.db.runAsync(
          'DELETE FROM consist_members WHERE consist_id = ?',
          id,
        );
      }
      for (const [position, member] of draft.members.entries()) {
        await this.db.runAsync(
          `INSERT INTO consist_members (consist_id, loco_id, position,
             reversed, speed_offset)
           VALUES (?, ?, ?, ?, ?)`,
          id,
          member.locoId,
          position,
          member.reversed ? 1 : 0,
          member.speedOffset,
        );
      }
    });
    if (id === undefined) {
      throw new Error('Saving the consist did not produce an id');
    }
    return id;
  }

  async remove(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM consists WHERE id = ?', id);
  }

  // Scales the speed offsets of a loco in every consist, e.g. after its
  // speed-step mode changed.
  async updateOffsets(
    locoId: number,
    convert: (offset: number) => number,
  ): Promise<void> {
    const rows = await this.db.getAllAsync<MemberRow>(
      'SELECT * FROM consist_members WHERE loco_id = ?',
      locoId,
    );
    for (const row of rows) {
      await this.db.runAsync(
        `UPDATE consist_members SET speed_offset = ?
         WHERE consist_id = ? AND loco_id = ?`,
        convert(row.speed_offset),
        row.consist_id,
        locoId,
      );
    }
  }
}
