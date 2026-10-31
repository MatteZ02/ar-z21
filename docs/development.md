# Development guide

> This guide is being written phase by phase. Windows setup, dev builds, the
> dummy-server workflow and release builds will be added in later phases.

## Changing colours

All colours are defined in [`src/theme/`](../src/theme/). Components never contain colour values;
they read semantic tokens from `useTheme()`. Linting fails if a colour such as `'#ff0000'` or
`'rgb(…)'` is written anywhere outside `src/theme/`.

The theme has two layers:

| File | What it contains | When to edit it |
|---|---|---|
| `src/theme/palette.ts` | The raw colour values (`red700: '#C62828'`, …) | To change a shade everywhere it is used |
| `src/theme/colors.ts` | Semantic tokens (`stopButton`, `statusShortCircuit`, …) for light **and** dark mode, pointing at palette entries | To change what a part of the app uses |

Spacing, corner radii, font sizes and the minimum touch-target size are in `src/theme/tokens.ts`.

### Example: make the STOP button darker red

Option 1: change the shade itself. Every token using `red700` changes too:

```ts
// src/theme/palette.ts
red700: '#A31515',
```

Option 2: change only the STOP button by pointing its token at a different palette entry, in
both light and dark mode:

```ts
// src/theme/colors.ts
export const lightColors: ColorTokens = {
  // …
  stopButton: palette.red800,
};

export const darkColors: ColorTokens = {
  // …
  stopButton: palette.red800,
};
```

To use a completely new colour, add it to `palette.ts` first, then reference it from
`colors.ts`.

### Using colours in a component

```tsx
import {useTheme} from '../theme';

const StopButton = () => {
  const {colors, minTouchTarget} = useTheme();
  return (
    <Pressable
      style={{backgroundColor: colors.stopButton, minHeight: minTouchTarget}}
    >
      <Text style={{color: colors.textOnStopButton}}>{strings.stop}</Text>
    </Pressable>
  );
};
```

### Rules for safety colours

- Text on a status or STOP colour uses its matching text token (`textOnStatus`,
  `textOnEmergencyStop`, `textOnStopButton`). Keep a contrast ratio of at least 4.5:1 for text
  and 3:1 for icons and indicators. Check new values with any WCAG contrast checker.
- Never rely on colour alone. Always show the status as text or an icon as well, because some
  members are colour-blind.
