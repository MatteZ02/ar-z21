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

export const emptyDetails = (): LocoDetails => ({
  fullName: '',
  railway: '',
  articleNumber: '',
  decoderType: '',
  buildYear: '',
});
