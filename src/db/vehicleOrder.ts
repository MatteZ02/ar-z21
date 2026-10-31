import {VehicleRef} from '../library/types';
import {SqlDatabase} from './database';

// Locos and consists share one list order (the `position` columns).

// Position for a new entry: after everything else.
export const nextPosition = async (db: SqlDatabase): Promise<number> => {
  const row = await db.getFirstAsync<{position: number | null}>(
    `SELECT MAX(position) AS position FROM (
       SELECT position FROM locos UNION ALL SELECT position FROM consists
     )`,
  );
  return (row?.position ?? -1) + 1;
};

// Stores a new order for the whole list.
export const reorderVehicles = async (
  db: SqlDatabase,
  refs: VehicleRef[],
): Promise<void> => {
  await db.withTransactionAsync(async () => {
    for (const [position, ref] of refs.entries()) {
      await db.runAsync(
        ref.kind === 'loco'
          ? 'UPDATE locos SET position = ? WHERE id = ?'
          : 'UPDATE consists SET position = ? WHERE id = ?',
        position,
        ref.id,
      );
    }
  });
};

// The current order, for merging the two tables into one list.
export const vehicleOrder = async (db: SqlDatabase): Promise<VehicleRef[]> => {
  const rows = await db.getAllAsync<{kind: 'loco' | 'consist'; id: number}>(
    `SELECT 'loco' AS kind, id, position FROM locos
     UNION ALL
     SELECT 'consist' AS kind, id, position FROM consists
     ORDER BY position, kind DESC, id`,
  );
  return rows.map(({kind, id}) => ({kind, id}));
};
