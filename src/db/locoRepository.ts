import {SpeedSteps} from '../protocol';
import {Loco, LocoDraft, LocoFunction, SpeedDisplay} from '../library/types';
import {SqlDatabase} from './database';

type LocoRow = {
  id: number;
  name: string;
  address: number;
  speed_steps: number;
  max_speed: number;
  speed_display: string;
  photo: string | null;
  notes: string;
  full_name: string;
  railway: string;
  article_number: string;
  decoder_type: string;
  build_year: string;
};

type FunctionRow = {
  loco_id: number;
  number: number;
  name: string;
  icon: string;
  momentary: number;
  slot: number;
};

const toSpeedSteps = (value: number): SpeedSteps =>
  value === 14 || value === 28 ? value : 128;

const toSpeedDisplay = (value: string): SpeedDisplay =>
  value === 'step' || value === 'mph' ? value : 'kmh';

const toFunction = (row: FunctionRow): LocoFunction => ({
  number: row.number,
  name: row.name,
  icon: row.icon,
  momentary: row.momentary !== 0,
  slot: row.slot,
});

const toLoco = (row: LocoRow, functions: LocoFunction[]): Loco => ({
  id: row.id,
  name: row.name,
  address: row.address,
  speedSteps: toSpeedSteps(row.speed_steps),
  maxSpeed: row.max_speed,
  speedDisplay: toSpeedDisplay(row.speed_display),
  photo: row.photo,
  notes: row.notes,
  details: {
    fullName: row.full_name,
    railway: row.railway,
    articleNumber: row.article_number,
    decoderType: row.decoder_type,
    buildYear: row.build_year,
  },
  functions,
});

// Plain SQL access to the loco library. Callers validate drafts first
// (validateDraft); the repository only stores them.
export class LocoRepository {
  constructor(private readonly db: SqlDatabase) {}

  // All locos in library order, with their functions sorted by slot.
  async list(): Promise<Loco[]> {
    const rows = await this.db.getAllAsync<LocoRow>(
      'SELECT * FROM locos ORDER BY position, id',
    );
    const functionRows = await this.db.getAllAsync<FunctionRow>(
      'SELECT * FROM loco_functions ORDER BY loco_id, slot',
    );
    const byLoco = new Map<number, LocoFunction[]>();
    for (const row of functionRows) {
      const list = byLoco.get(row.loco_id) ?? [];
      list.push(toFunction(row));
      byLoco.set(row.loco_id, list);
    }
    return rows.map((row) => toLoco(row, byLoco.get(row.id) ?? []));
  }

  async get(id: number): Promise<Loco | null> {
    const row = await this.db.getFirstAsync<LocoRow>(
      'SELECT * FROM locos WHERE id = ?',
      id,
    );
    if (row === null) {
      return null;
    }
    const functions = await this.db.getAllAsync<FunctionRow>(
      'SELECT * FROM loco_functions WHERE loco_id = ? ORDER BY slot',
      id,
    );
    return toLoco(row, functions.map(toFunction));
  }

  // Inserts a new loco (at the end of the list) or updates an existing one,
  // replacing its functions. Returns the loco's id.
  async save(draft: LocoDraft): Promise<number> {
    let id = draft.id;
    await this.db.withTransactionAsync(async () => {
      const values = [
        draft.name.trim(),
        draft.address,
        draft.speedSteps,
        draft.maxSpeed,
        draft.speedDisplay,
        draft.photo,
        draft.notes,
        draft.details.fullName,
        draft.details.railway,
        draft.details.articleNumber,
        draft.details.decoderType,
        draft.details.buildYear,
      ];
      if (id === undefined) {
        const last = await this.db.getFirstAsync<{position: number | null}>(
          'SELECT MAX(position) AS position FROM locos',
        );
        const result = await this.db.runAsync(
          `INSERT INTO locos (name, address, speed_steps, max_speed,
             speed_display, photo, notes, full_name, railway, article_number,
             decoder_type, build_year, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ...values,
          (last?.position ?? -1) + 1,
        );
        id = result.lastInsertRowId;
      } else {
        await this.db.runAsync(
          `UPDATE locos SET name = ?, address = ?, speed_steps = ?,
             max_speed = ?, speed_display = ?, photo = ?, notes = ?,
             full_name = ?, railway = ?, article_number = ?, decoder_type = ?,
             build_year = ?
           WHERE id = ?`,
          ...values,
          id,
        );
        await this.db.runAsync(
          'DELETE FROM loco_functions WHERE loco_id = ?',
          id,
        );
      }
      for (const fn of draft.functions) {
        await this.db.runAsync(
          `INSERT INTO loco_functions (loco_id, number, name, icon, momentary,
             slot)
           VALUES (?, ?, ?, ?, ?, ?)`,
          id,
          fn.number,
          fn.name.trim(),
          fn.icon,
          fn.momentary ? 1 : 0,
          fn.slot,
        );
      }
    });
    if (id === undefined) {
      throw new Error('Saving the loco did not produce an id');
    }
    return id;
  }

  // Deletes the loco and its functions.
  async remove(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM locos WHERE id = ?', id);
  }

  // Stores a new library order: ids in the order they should be listed.
  async reorder(ids: number[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const [position, id] of ids.entries()) {
        await this.db.runAsync(
          'UPDATE locos SET position = ? WHERE id = ?',
          position,
          id,
        );
      }
    });
  }
}
