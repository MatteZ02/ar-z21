import {maxSpeedStep, SpeedSteps} from '../protocol';

// Consist speed (brief §6.7) runs on the 128-step scale: 0 = stop,
// 1..CONSIST_MAX_SPEED = moving. Each member converts it to its own mode.
export const CONSIST_MAX_SPEED = maxSpeedStep(128);

// Largest speed difference for a member, in that member's own steps.
export const MAX_SPEED_OFFSET = 30;

export type MemberDriveInput = {
  speedSteps: SpeedSteps;
  // In the member's own speed steps; positive = faster.
  speedOffset: number;
  // The loco is coupled facing backwards.
  reversed: boolean;
};

export type MemberDrive = {speed: number; forward: boolean};

// The consist speed in a member's speed-step mode, before its offset.
// Rounds, but never turns a moving consist into a stopped member.
export const toMemberSteps = (
  consistSpeed: number,
  steps: SpeedSteps,
): number => {
  if (consistSpeed <= 0) {
    return 0;
  }
  const scaled = Math.round(
    (Math.min(consistSpeed, CONSIST_MAX_SPEED) * maxSpeedStep(steps)) /
      CONSIST_MAX_SPEED,
  );
  return Math.max(1, scaled);
};

// What one member is sent for a consist speed and direction. Safety rules
// (brief §6.7):
// - consist speed 0 means 0 for every member, whatever the offset;
// - the offset never changes the direction;
// - the result is clamped to the member's range; a moving consist keeps
//   every member moving (at least step 1), so none is dragged along.
export const memberDrive = (
  consistSpeed: number,
  consistForward: boolean,
  member: MemberDriveInput,
): MemberDrive => {
  const forward = member.reversed ? !consistForward : consistForward;
  const base = toMemberSteps(consistSpeed, member.speedSteps);
  if (base === 0) {
    return {speed: 0, forward};
  }
  const speed = Math.min(
    maxSpeedStep(member.speedSteps),
    Math.max(1, base + member.speedOffset),
  );
  return {speed, forward};
};

// The consist speed and direction shown on the throttle, read back from the
// lead member's reported state (the central unit knows no consists).
export const consistFromLead = (
  leadSpeed: number,
  leadForward: boolean,
  lead: MemberDriveInput,
): MemberDrive => {
  const forward = lead.reversed ? !leadForward : leadForward;
  if (leadSpeed <= 0) {
    return {speed: 0, forward};
  }
  const withoutOffset = leadSpeed - lead.speedOffset;
  const speed = Math.round(
    (withoutOffset * CONSIST_MAX_SPEED) / maxSpeedStep(lead.speedSteps),
  );
  return {
    speed: Math.min(CONSIST_MAX_SPEED, Math.max(1, speed)),
    forward,
  };
};

// Keeps an offset meaningful when a loco's speed-step mode changes.
export const convertOffset = (
  offset: number,
  from: SpeedSteps,
  to: SpeedSteps,
): number => Math.round((offset * maxSpeedStep(to)) / maxSpeedStep(from));

export const isValidOffset = (offset: number): boolean =>
  Number.isInteger(offset) && Math.abs(offset) <= MAX_SPEED_OFFSET;
