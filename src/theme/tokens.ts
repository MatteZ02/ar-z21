// Non-colour design tokens. Font sizes are base sizes; React Native scales
// them with the user's system font size setting, so do not disable
// allowFontScaling.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  round: 9999,
} as const;

export const fontSizes = {
  small: 14,
  body: 17,
  large: 20,
  title: 24,
  display: 32,
} as const;

// Minimum size of any touchable element, in dp. Larger than the platform
// minimum (44/48) because the app is used by children and elderly members.
export const minTouchTarget = 56;
