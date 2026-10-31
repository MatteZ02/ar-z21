import {SpeedSteps} from '../protocol';

// How the throttle shows a loco's speed. Same choices as the Roco Z21 app.
export type SpeedDisplay = 'kmh' | 'step' | 'mph';

export type LocoFunction = {
  // F0..F31.
  number: number;
  // Shown under the icon, e.g. "Tunnel mode". May be empty.
  name: string;
  // Key into FUNCTION_ICONS.
  icon: string;
  // Momentary: on while held. Otherwise latching (tap on, tap off).
  momentary: boolean;
  // Slot in the function grid, see functionSlots.ts.
  slot: number;
};

// Free-text details, as on the Roco app's Data tab.
export type LocoDetails = {
  fullName: string;
  railway: string;
  articleNumber: string;
  decoderType: string;
  buildYear: string;
};

export type Loco = {
  id: number;
  name: string;
  address: number;
  speedSteps: SpeedSteps;
  // Top speed in km/h, for the km/h and mph displays.
  maxSpeed: number;
  speedDisplay: SpeedDisplay;
  // File name in the photo directory, or null.
  photo: string | null;
  notes: string;
  details: LocoDetails;
  functions: LocoFunction[];
};

// A loco being created or edited: no id yet for a new one.
export type LocoDraft = Omit<Loco, 'id'> & {id?: number};

// A library loco in a consist (brief §6.7).
export type ConsistMember = {
  locoId: number;
  // Coupled facing backwards: drives in the opposite direction.
  reversed: boolean;
  // Speed difference in the loco's own speed steps; see consistMath.ts.
  speedOffset: number;
};

// Several locos driven as one train. Members are in train order; the first
// is the lead loco.
export type Consist = {
  id: number;
  name: string;
  photo: string | null;
  members: ConsistMember[];
};

export type ConsistDraft = Omit<Consist, 'id'> & {id?: number};

// One entry of the vehicle list or a throttle's recent strip.
export type VehicleRef = {kind: 'loco' | 'consist'; id: number};

export const sameVehicle = (a: VehicleRef, b: VehicleRef): boolean =>
  a.kind === b.kind && a.id === b.id;

export const emptyDetails = (): LocoDetails => ({
  fullName: '',
  railway: '',
  articleNumber: '',
  decoderType: '',
  buildYear: '',
});
