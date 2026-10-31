import {useColorScheme} from 'react-native';
import {ColorTokens, darkColors, lightColors} from './colors';
import {fontSizes, minTouchTarget, radii, spacing} from './tokens';

export type Theme = {
  dark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  minTouchTarget: number;
};

const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  spacing,
  radii,
  fontSizes,
  minTouchTarget,
};

const darkTheme: Theme = {...lightTheme, dark: true, colors: darkColors};

export const useTheme = (): Theme => {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
};

export type {ColorTokens};
export {fontSizes, minTouchTarget, radii, spacing};
