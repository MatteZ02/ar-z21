# CLAUDE.md

Mobile app (Expo / React Native / TypeScript) that replaces Roco's Z21 app for driving model
trains. It talks **directly** to the central unit (Roco Z21/z21/z21 start, DigiKeijs DR5000) over
UDP using the Z21 LAN protocol. There is no server, backend, accounts or analytics.

- Requirements: `CLAUDE_CODE_PROMPT.md` (the project brief).
- Protocol: `docs/reference/z21-lan-protokoll-en_1.13.pdf` is the source of truth;
  `docs/reference/z21-protocol-notes.md` is a navigation aid with byte layouts, page references and
  known ambiguities.
- If the spec is ambiguous, or hardware behaves differently from it, tell the user; do not silently
  work around it.

## Status

| Phase | Content | State |
|---|---|---|
| 0 | Setup, theme, protocol notes | done, awaiting approval |
| 1 | Protocol layer + tests, UDP module, connection manager | next |
| 2 | Throttle, track status, STOP | |
| 3 | Library, photos, loco switching | |
| 4 | Split screen | |
| 5 | Consists, Roco export import | |
| 6 | Builds and docs | |

Still waiting for: Roco app screenshots, the Roco export file, DR5000 docs and dummy-server notes.
**Do not invent UI layouts or the export format.** Work that depends on them waits.

TODO before release: the app name `AR Z21` and the bundle ID / package `com.example.arz21` in
`app.json` are **placeholders**, and the licence has not been chosen.

## Commands

```sh
npm run lint        # ESLint (flat config) + Prettier as warnings
npm run typecheck   # tsc --noEmit (strict)
npm test            # Jest (from Phase 1)
npx expo run:android   # dev build on emulator/device (needs Android SDK)
npx expo start --dev-client
```

Expo Go **cannot** be used, because UDP needs a native module. Use development builds.
Development happens on Windows. iOS builds go through EAS Build (cloud), so no Mac is needed.
For the Android emulator, the host PC (dummy Z21 server) is `10.0.2.2`.

## Architecture (keep the layers separate)

```
index.ts                entry (registerRootComponent)
app/                    Expo Router routes: thin, they render screens from src/ui
modules/z21-udp/        local Expo Module: UDP socket (Kotlin DatagramSocket / Swift NWConnection)
src/
  protocol/             PURE TypeScript. No React / React Native imports. Encode/decode datasets.
  connection/           ConnectionManager: one socket, connect/keepalive/reconnect/logoff,
                        subscription set (max 16), 100 ms throttle, typed events.
                        Depends on a UdpTransport interface, so tests use a fake.
  consist/              PURE consist math: offsets, direction, function routing
  store/                Zustand stores: connection, track status, live loco state, library, settings
  db/                   expo-sqlite schema, migrations (PRAGMA user_version), repositories
  import/               Roco Z21 export importer (pure logic, separate from UI)
  ui/screens, ui/components
  theme/                palette.ts, colors.ts (semantic light/dark), tokens.ts, useTheme()
  strings.ts            ALL user-visible text (English only)
```

Not all folders exist yet. Create them in the phase that needs them.

## Rules that matter

**Protocol and load (10 devices may share one central unit):**
- Broadcast flags: only `0x00000001`. **Never `0x00010000`.** System-state broadcasts (`0x100`) are
  optional and off by default. Re-send the flags after every (re)connect.
- Subscribe (LAN_X_GET_LOCO_INFO) only to locos shown on screen. Each consist member counts. Max 16,
  FIFO, so track the set yourself.
- Drive commands: at most one per loco per `THROTTLE_INTERVAL_MS` (100), always the latest value,
  always the final value, nothing if unchanged. Pack several datasets into one datagram per tick.
- No polling loops. Send a keepalive only when idle, well inside the 60 s timeout.
- Optional requests (HWINFO, GET_CODE, SystemState, E_STOP on old FW) must time out with a fallback
  and never block the UI.
- Displayed loco state follows LAN_X_LOCO_INFO. Optimistic UI is fine, but always reconcile.
- Functions: use LAN_X_SET_LOCO_FUNCTION with explicit on/off. Do not use FUNCTION_GROUP.
- Receive: always split a datagram into all of its datasets by DataLen.

**Safety:**
- The global STOP is always visible on driving screens. No confirmation on driving actions or STOP.
- Consist offsets never move a loco at speed 0, never reverse it, and are clamped to 0…max.
  E-stop/STOP ignore offsets.

**Code:**
- TypeScript strict. Readable and conventional over clever. Avoid new dependencies unless needed.
- Colours only via `useTheme()` semantic tokens. Lint fails on colour literals outside `src/theme/`.
  Spacing, radii, font sizes and `minTouchTarget` also come from the theme.
- Status colours are always paired with text or an icon.
- User-visible strings come from `src/strings.ts`.
- Pure logic (protocol, consist math, importer) gets Jest unit tests. Protocol tests use
  byte-exact values from the spec.
- Prettier: single quotes, semicolons, `bracketSpacing: false`, 2 spaces, LF line endings
  (enforced by `.gitattributes`). ESLint `import/order` with no blank lines between groups.
- Accessibility: large touch targets, respect system font size (do not disable font scaling).
  Dark and light mode, portrait and landscape.

**Git:** small logical commits, one feature branch per phase (`feat/phase-N-…`). Do not push or
open PRs unless asked. Never commit keystores or signing keys (`*.jks`, `*.p12`, … are
gitignored).

## Libraries

These are planned, pending approval; each is installed in the phase that needs it.

- Expo SDK 58 / RN 0.88 (New Architecture only), expo-dev-client.
- Navigation: Expo Router.
- State: Zustand.
- Storage: expo-sqlite (plain SQL, no ORM) and expo-file-system (photos).
- Photos: expo-image-picker and expo-image-manipulator (resize before storing).
- Import: expo-document-picker and fflate (unzip).
- Driving UX: expo-keep-awake and expo-haptics.
- Icons: @expo/vector-icons (MaterialCommunityIcons). No Roco assets.
- Tests: Jest via jest-expo.
- UDP: our own Expo Module in `modules/z21-udp`. `react-native-udp` was rejected: no commits since
  2023 and no New Architecture support.
