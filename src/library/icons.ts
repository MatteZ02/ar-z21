import type {IconName} from '../ui/components/Icon';

// The app's own function icons (MaterialCommunityIcons, Apache-2.0). Roco's
// icons are not used; the importer (Phase 5) maps Roco's icon identifiers to
// these ids. 'none' shows the plain function letter.
export const FUNCTION_ICONS = {
  none: null,
  light: 'lightbulb-on',
  headlight: 'car-light-high',
  lowBeam: 'car-light-dimmed',
  tailLight: 'car-parking-lights',
  cabLight: 'lightbulb-outline',
  interiorLight: 'ceiling-light',
  sound: 'volume-high',
  horn: 'bullhorn',
  whistle: 'whistle',
  bell: 'bell',
  announcement: 'account-voice',
  music: 'music',
  mute: 'volume-off',
  volumeUp: 'volume-plus',
  volumeDown: 'volume-minus',
  engine: 'engine',
  brake: 'car-brake-alert',
  compressor: 'air-filter',
  fan: 'fan',
  sand: 'grain',
  smoke: 'smoke',
  steam: 'weather-windy',
  pantograph: 'transmission-tower',
  doorOpen: 'door-open',
  doorClose: 'door-closed',
  couple: 'link-variant',
  uncouple: 'link-variant-off',
  shunting: 'tortoise',
  momentum: 'rabbit',
  crane: 'crane',
  rotateLeft: 'rotate-left',
  rotateRight: 'rotate-right',
  up: 'arrow-up-bold',
  down: 'arrow-down-bold',
  wiper: 'wiper',
  generic: 'cog',
} as const satisfies Record<string, IconName | null>;

export type FunctionIconId = keyof typeof FUNCTION_ICONS;

export const FUNCTION_ICON_IDS = Object.keys(
  FUNCTION_ICONS,
) as FunctionIconId[];

export const isFunctionIconId = (id: string): id is FunctionIconId =>
  Object.prototype.hasOwnProperty.call(FUNCTION_ICONS, id);

// Unknown ids (e.g. from a newer app version) fall back to the plain letter.
export const functionIcon = (id: string): IconName | null =>
  isFunctionIconId(id) ? FUNCTION_ICONS[id] : null;
