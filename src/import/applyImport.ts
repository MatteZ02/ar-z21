import {LibraryService} from '../library/LibraryService';
import {ConsistMember} from '../library/types';
import {DEFAULT_SPEED_STEPS} from '../protocol';
import {ImportPlan, memberTarget} from './importPlan';

export type ImportResult = {
  added: number;
  replaced: number;
  skipped: number;
  consists: number;
  // Locos or consists that failed to save (names).
  failed: string[];
};

// Writes a planned import into the library. `storePhoto` copies a photo out
// of the export into the app's photo store and returns the stored name (or
// null if it could not be copied).
export const applyImport = async (
  plan: ImportPlan,
  library: LibraryService,
  storePhoto: (name: string) => Promise<string | null>,
): Promise<ImportResult> => {
  const result: ImportResult = {
    added: 0,
    replaced: 0,
    skipped: 0,
    consists: 0,
    failed: [],
  };
  // sourceId in the export -> library loco id.
  const idBySource = new Map<number, number>();

  for (const entry of plan.locos) {
    const {loco} = entry;
    if (entry.choice === 'skip') {
      result.skipped++;
      const target = memberTarget(entry, undefined);
      if (target !== undefined) {
        idBySource.set(loco.sourceId, target);
      }
      continue;
    }
    const replacing =
      entry.choice === 'replace' ? entry.existing[0] : undefined;
    const photo = loco.photo === null ? null : await storePhoto(loco.photo);
    const saved = await library.save({
      id: replacing?.id,
      name: loco.name,
      address: loco.address,
      // Not in the export; 128 steps (decided by the user).
      speedSteps: replacing?.speedSteps ?? DEFAULT_SPEED_STEPS,
      maxSpeed: loco.maxSpeed,
      speedDisplay: loco.speedDisplay,
      photo,
      notes: loco.notes,
      details: loco.details,
      functions: loco.functions,
    });
    if (!saved.ok) {
      result.failed.push(loco.name);
      continue;
    }
    idBySource.set(loco.sourceId, saved.id);
    if (replacing === undefined) {
      result.added++;
    } else {
      result.replaced++;
    }
  }

  for (const consist of plan.consists) {
    const members: ConsistMember[] = consist.members.flatMap((member) => {
      const locoId = idBySource.get(member.sourceId);
      return locoId === undefined
        ? []
        : [{locoId, reversed: member.reversed, speedOffset: 0}];
    });
    // The same loco twice (e.g. two skipped duplicates mapping to one
    // library loco) would be refused; keep the first.
    const unique = members.filter(
      (member, index) =>
        members.findIndex((other) => other.locoId === member.locoId) === index,
    );
    if (unique.length === 0) {
      result.failed.push(consist.name);
      continue;
    }
    const photo =
      consist.photo === null ? null : await storePhoto(consist.photo);
    const saved = await library.saveConsist({
      name: consist.name,
      photo,
      members: unique,
    });
    if (saved.ok) {
      result.consists++;
    } else {
      result.failed.push(consist.name);
    }
  }
  return result;
};
