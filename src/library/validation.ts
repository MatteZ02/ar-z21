import {isValidOffset} from '../consist/consistMath';
import {isValidLocoAddress} from '../protocol';
import {MAX_FUNCTION_NUMBER, MAX_SLOTS} from './functionSlots';
import {ConsistDraft, LocoDraft} from './types';

export const MAX_SPEED_KMH = 500;
// Acceleration in km/h per second.
export const MIN_ACCELERATION = 0.1;
export const MAX_ACCELERATION = 100;

export type DraftProblem =
  | 'nameMissing'
  | 'addressInvalid'
  | 'maxSpeedInvalid'
  | 'accelerationInvalid'
  | 'functionNumberInvalid'
  | 'functionNumberDuplicate'
  | 'functionSlotInvalid'
  | 'functionSlotDuplicate';

// Problems that prevent saving, in the order they should be shown.
export const validateDraft = (draft: LocoDraft): DraftProblem[] => {
  const problems: DraftProblem[] = [];
  if (draft.name.trim() === '') {
    problems.push('nameMissing');
  }
  if (!isValidLocoAddress(draft.address)) {
    problems.push('addressInvalid');
  }
  if (
    !Number.isInteger(draft.maxSpeed) ||
    draft.maxSpeed < 1 ||
    draft.maxSpeed > MAX_SPEED_KMH
  ) {
    problems.push('maxSpeedInvalid');
  }
  if (
    !Number.isFinite(draft.acceleration) ||
    draft.acceleration < MIN_ACCELERATION ||
    draft.acceleration > MAX_ACCELERATION
  ) {
    problems.push('accelerationInvalid');
  }
  const numbers = draft.functions.map((fn) => fn.number);
  if (
    numbers.some(
      (n) => !Number.isInteger(n) || n < 0 || n > MAX_FUNCTION_NUMBER,
    )
  ) {
    problems.push('functionNumberInvalid');
  }
  if (new Set(numbers).size !== numbers.length) {
    problems.push('functionNumberDuplicate');
  }
  const slots = draft.functions.map((fn) => fn.slot);
  if (slots.some((s) => !Number.isInteger(s) || s < 0 || s >= MAX_SLOTS)) {
    problems.push('functionSlotInvalid');
  }
  if (new Set(slots).size !== slots.length) {
    problems.push('functionSlotDuplicate');
  }
  return problems;
};

export type ConsistProblem =
  'nameMissing' | 'membersMissing' | 'memberDuplicate' | 'offsetInvalid';

// Problems that prevent saving a consist.
export const validateConsistDraft = (draft: ConsistDraft): ConsistProblem[] => {
  const problems: ConsistProblem[] = [];
  if (draft.name.trim() === '') {
    problems.push('nameMissing');
  }
  if (draft.members.length === 0) {
    problems.push('membersMissing');
  }
  const ids = draft.members.map((member) => member.locoId);
  if (new Set(ids).size !== ids.length) {
    problems.push('memberDuplicate');
  }
  if (draft.members.some((member) => !isValidOffset(member.speedOffset))) {
    problems.push('offsetInvalid');
  }
  return problems;
};
