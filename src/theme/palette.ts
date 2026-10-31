// Base palette: the raw colour values. Components never use these directly;
// they go through the semantic tokens in colors.ts. To restyle the app, change
// values here (or point a token in colors.ts at a different palette entry).
export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  gray50: '#F5F6F8',
  gray100: '#E9ECF0',
  gray300: '#C3C9D1',
  gray500: '#6B7480',
  gray600: '#4F5762',
  gray700: '#3A414B',
  gray800: '#252A31',
  gray900: '#15181C',

  blue600: '#1F5FD1',
  blue300: '#7DB0FF',

  green700: '#2E7D32',
  green300: '#81C784',

  amber700: '#A15C00',
  amber500: '#F2A900',
  amber300: '#FFD54F',

  red800: '#B71C1C',
  red700: '#C62828',
  red400: '#EF5350',

  purple700: '#6A1B9A',
  purple300: '#CE93D8',

  teal700: '#00796B',
  teal300: '#4DD0C1',

  scrim: 'rgba(0, 0, 0, 0.55)',
  transparent: 'transparent',
} as const;
