import {Loco} from '../library/types';
import {ImportedLoco, RocoExport} from './rocoExport';

// What to do with an imported loco whose address is already in the library
// (brief §7): skip it, replace the library loco, or keep both.
export type DuplicateChoice = 'skip' | 'replace' | 'keepBoth';

export type PlannedLoco = {
  loco: ImportedLoco;
  // Library locos with the same address (the first is the one replaced).
  existing: Loco[];
  choice: DuplicateChoice;
};

export type ImportPlan = {
  locos: PlannedLoco[];
  // Consists are always added; members follow their locos' choices.
  consists: RocoExport['consists'];
};

// The starting plan: locos without a clash are added; for clashes the
// choice starts as `defaultChoice` and the user can change it per loco.
export const makeImportPlan = (
  data: RocoExport,
  library: Loco[],
  defaultChoice: DuplicateChoice = 'skip',
): ImportPlan => ({
  locos: data.locos.map((loco) => {
    const existing = library.filter((entry) => entry.address === loco.address);
    return {
      loco,
      existing,
      choice: existing.length === 0 ? 'keepBoth' : defaultChoice,
    };
  }),
  consists: data.consists,
});

export const withChoice = (
  plan: ImportPlan,
  sourceId: number,
  choice: DuplicateChoice,
): ImportPlan => ({
  ...plan,
  locos: plan.locos.map((entry) =>
    entry.loco.sourceId === sourceId && entry.existing.length > 0
      ? {...entry, choice}
      : entry,
  ),
});

export const withChoiceForAll = (
  plan: ImportPlan,
  choice: DuplicateChoice,
): ImportPlan => ({
  ...plan,
  locos: plan.locos.map((entry) =>
    entry.existing.length > 0 ? {...entry, choice} : entry,
  ),
});

export type ImportSummary = {
  added: number;
  replaced: number;
  skipped: number;
  consists: number;
};

export const summarize = (plan: ImportPlan): ImportSummary => {
  const count = (test: (entry: PlannedLoco) => boolean) =>
    plan.locos.filter(test).length;
  return {
    added: count((entry) => entry.choice === 'keepBoth'),
    replaced: count((entry) => entry.choice === 'replace'),
    skipped: count((entry) => entry.choice === 'skip'),
    consists: plan.consists.length,
  };
};

// The library loco that each imported loco ends up as, for linking consist
// members: a skipped loco maps to the existing library loco with its
// address, so a consist still works with the locos already there.
export const memberTarget = (
  entry: PlannedLoco,
  savedId: number | undefined,
): number | undefined =>
  entry.choice === 'skip' ? entry.existing[0]?.id : savedId;
