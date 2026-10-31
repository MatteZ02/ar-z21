import {palette} from './palette';

// Semantic colour tokens. Components use these names only (via useTheme()),
// never palette entries or colour literals. Every token has a light and a dark
// value.
//
// Safety-status colours must never be the only signal: always pair them with
// text or an icon.
export type ColorTokens = {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textOnAccent: string;
  accent: string;

  throttleTrack: string;
  throttleFill: string;
  throttleThumb: string;
  functionActive: string;
  functionInactive: string;
  textOnFunctionActive: string;

  stopButton: string;
  textOnStopButton: string;

  statusNormal: string;
  statusEmergencyStop: string;
  statusPowerOff: string;
  statusShortCircuit: string;
  statusProgramming: string;
  // Text drawn on top of the status colours above.
  textOnStatus: string;
  // statusEmergencyStop is a light colour, so it needs dark text.
  textOnEmergencyStop: string;

  sharedControlFlag: string;

  connectionOk: string;
  connectionConnecting: string;
  connectionError: string;
};

export const lightColors: ColorTokens = {
  background: palette.gray50,
  surface: palette.white,
  border: palette.gray300,
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textOnAccent: palette.white,
  accent: palette.blue600,

  throttleTrack: palette.gray100,
  throttleFill: palette.blue600,
  throttleThumb: palette.gray900,
  functionActive: palette.blue600,
  functionInactive: palette.gray100,
  textOnFunctionActive: palette.white,

  stopButton: palette.red700,
  textOnStopButton: palette.white,

  statusNormal: palette.green700,
  statusEmergencyStop: palette.amber500,
  statusPowerOff: palette.gray700,
  statusShortCircuit: palette.red800,
  statusProgramming: palette.purple700,
  textOnStatus: palette.white,
  textOnEmergencyStop: palette.black,

  sharedControlFlag: palette.teal700,

  connectionOk: palette.green700,
  connectionConnecting: palette.amber700,
  connectionError: palette.red700,
};

export const darkColors: ColorTokens = {
  background: palette.gray900,
  surface: palette.gray800,
  border: palette.gray700,
  textPrimary: palette.gray50,
  textSecondary: palette.gray300,
  textOnAccent: palette.gray900,
  accent: palette.blue300,

  throttleTrack: palette.gray700,
  throttleFill: palette.blue300,
  throttleThumb: palette.white,
  functionActive: palette.blue300,
  functionInactive: palette.gray700,
  textOnFunctionActive: palette.gray900,

  stopButton: palette.red700,
  textOnStopButton: palette.white,

  statusNormal: palette.green700,
  statusEmergencyStop: palette.amber300,
  statusPowerOff: palette.gray600,
  statusShortCircuit: palette.red700,
  statusProgramming: palette.purple700,
  textOnStatus: palette.white,
  textOnEmergencyStop: palette.black,

  sharedControlFlag: palette.teal300,

  connectionOk: palette.green300,
  connectionConnecting: palette.amber300,
  connectionError: palette.red400,
};
