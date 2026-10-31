import {FunctionIconId} from '../library/icons';

// Roco Z21 app icon identifiers (functions.image_name in the export) mapped to
// the app's own icons. Roco's artwork is never copied, only its names are
// read. Unknown or empty names fall back to the plain function letter.
const ROCO_ICONS: Record<string, FunctionIconId> = {
  // Lights
  light: 'light',
  main: 'light',
  main_beam: 'headlight',
  main_beam2: 'headlight',
  back_light: 'tailLight',
  all_round_light: 'light',
  cabin_light: 'cabLight',
  cockpit_light_left: 'cabLight',
  cockpit_light_right: 'cabLight',
  interior_light: 'interiorLight',
  // Sounds
  sound1: 'sound',
  sound2: 'sound',
  sound3: 'sound',
  sound4: 'sound',
  sound5: 'sound',
  horn_high: 'horn',
  horn_low: 'horn',
  horn_two_sound: 'horn',
  bugle: 'horn',
  whistle_short: 'whistle',
  clef: 'music',
  mute: 'mute',
  louder: 'volumeUp',
  quiter: 'volumeDown',
  curve_sound: 'sound',
  rail_kick: 'sound',
  puffer_kick: 'sound',
  warning: 'bell',
  sound_brake: 'brake',
  // Machinery
  compressor: 'compressor',
  valve: 'steam',
  blower: 'fan',
  fan: 'fan',
  sanden: 'sand',
  brake_delay: 'brake',
  acc_delay: 'momentum',
  hump_gear: 'shunting',
  neutral: 'generic',
  forward_take_power: 'pantograph',
  backward_take_power: 'pantograph',
  // Doors and couplings
  door_open: 'doorOpen',
  door_close: 'doorClose',
  couple: 'couple',
  decouple: 'uncouple',
  // Cranes
  crane_arm_down: 'down',
  rotate_left: 'rotateLeft',
  rotate_right: 'rotateRight',
  // Placeholder for an unassigned button
  empty: 'none',
};

export const iconForRoco = (name: string | null): FunctionIconId =>
  (name !== null && ROCO_ICONS[name.trim()]) || 'none';

// Whether a Roco icon name is known, for the import report.
export const isKnownRocoIcon = (name: string | null): boolean =>
  name === null || name.trim() === '' || name.trim() in ROCO_ICONS;
