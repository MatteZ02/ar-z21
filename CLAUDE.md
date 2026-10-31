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
| 0 | Setup, theme, protocol notes | done |
| 1 | Protocol layer + tests, UDP module, connection manager | code done; Android module verified on the emulator against a fake Z21; awaiting the dummy server, real hardware and iOS |
| 2 | Throttle, track status, STOP | code done, verified on the emulator against a fake Z21; awaiting user review |
| 3 | Library, photos, loco switching | |
| 4 | Split screen | |
| 5 | Consists, Roco export import | |
| 6 | Builds and docs | |

Roco app screenshots (`docs/reference/*_phone.PNG`, `*_tablet.PNG`) and a Roco export
(`docs/reference/z21_layout_import.z21`) are in the repo folder but untracked; the user decides
whether to commit them. Follow the screenshots for layout and flow, without Roco's branding,
icons or photos. Still waiting for: DR5000 docs and dummy-server notes.
**Do not invent UI layouts or the export format.** Inspect the export before writing the importer.

Target central units are assumed to run the latest firmware (not yet confirmed), so FW 1.43
features such as LAN_X_SET_LOCO_E_STOP are the primary path. Fallbacks for older or third-party
firmware stay in place.

The `chore/upgrade-expo-sdk-58` history has no common ancestor with `main`. The user allows `main`
to be reset to it, but has not yet asked for that; do not do it unprompted. The user handles
committing the spec PDF / brief and all pushing.

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
app/                    Expo Router routes (entry: expo-router/entry): thin, they render
                        screens from src/ui. _layout.tsx mounts AppServicesProvider.
modules/z21-udp/        local Expo Module: UDP socket (Kotlin DatagramSocket / Swift NWConnection)
src/
  protocol/             PURE TypeScript. No React / React Native imports. Encode/decode datasets.
  connection/           ConnectionManager: one socket, connect/keepalive/reconnect/logoff,
                        subscription set (max 16), 100 ms throttle, typed events.
                        Depends on a UdpTransport interface, so tests use a fake.
  driving/              Global STOP taps, pending-change reconciliation, shared-control
                        detection (pure, tested) and DriveController, which every throttle
                        action goes through.
  consist/              PURE consist math: offsets, direction, function routing
  store/                Zustand stores: connection, track status, live loco state, library, settings
  db/                   expo-sqlite schema, migrations (PRAGMA user_version), repositories
  import/               Roco Z21 export importer (pure logic, separate from UI)
  ui/screens, ui/components
  theme/                palette.ts, colors.ts (semantic light/dark), tokens.ts, useTheme()
  strings.ts            ALL user-visible text (English only)
```

Not all folders exist yet. Create them in the phase that needs them.

Current entry points:
- `src/connection/ConnectionManager.ts`: the whole connection lifecycle.
- `src/connection/nativeUdpTransport.ts`: the only file importing the native module. Keep it
  out of `src/connection/index.ts` so the rest stays testable.
- `src/connection/testUtils/`: the fake transport and the Node `dgram` transport for tests.
- `src/ui/AppServices.tsx`: creates the one ConnectionManager and DriveController, binds the
  stores, connects at start-up, handles background/foreground. `useServices()` gives access.
- `src/ui/components/ScreenFrame.tsx`: every screen's frame (header with connection indicator
  and global STOP, track status banner).
- `src/ui/screens/DriveScreen.tsx`: the single throttle, laid out after `driving_phone.PNG`.
- `src/ui/debug/ConnectionDebugScreen.tsx`: developer test screen (Settings → For developers).

This machine (the user's Windows PC) has Android Studio on `D:`, but `ANDROID_HOME`/`JAVA_HOME`
may not be set in Claude's shell; set them per command (`%LOCALAPPDATA%\Android\Sdk`,
`D:\Program Files\Android\Android Studio\jbr`). The SDK's ninja was replaced with 1.12.1 for long
paths (see `docs/development.md`). Emulator AVD: `Medium_Phone_API_37.0` (x86_64).

## Rules that matter

**Protocol and load (10 devices may share one central unit):**
- Broadcast flags: only `0x00000001`. **Never `0x00010000`.** System-state broadcasts (`0x100`) are
  optional and off by default. Re-send the flags after every (re)connect.
- Subscribe (LAN_X_GET_LOCO_INFO) only to locos shown on screen. Each consist member counts. Max 16,
  FIFO, so track the set yourself.
- Drive commands: at most one per loco per `THROTTLE_INTERVAL_MS` (100), always the latest value,
  always the final value, nothing if unchanged. Pack several datasets into one datagram per tick.
- No polling loops. Keepalive = LAN_X_GET_STATUS, sent only after ~25 s with nothing else sent
  (well inside the 60 s timeout). Decided by the user.
- Optional requests (HWINFO, GET_CODE, SystemState, E_STOP on old FW) must time out with a fallback
  and never block the UI.
- Displayed loco state follows LAN_X_LOCO_INFO. Optimistic UI is fine, but always reconcile.
- Functions: use LAN_X_SET_LOCO_FUNCTION with explicit on/off. Do not use FUNCTION_GROUP.
- Receive: always split a datagram into all of its datasets by DataLen.

**Safety:**
- The global STOP is always visible on driving screens. No confirmation on driving actions or STOP.
- Global STOP behaviour (decided by the user; configurable in settings):
  - Default: **one tap = emergency stop** (LAN_X_SET_STOP, track stays powered), sent immediately
    with no delay waiting for a possible second tap.
  - **A second tap in quick succession additionally switches track power off**
    (LAN_X_SET_TRACK_POWER_OFF).
  - The double-tap window is a named constant.
  - Restoring power is a separate, explicit control.
- The loco's own STOP sends the drive command with the E-Stop speed value, plus
  LAN_X_SET_LOCO_E_STOP on FW 1.43+, in one datagram (decided by the user: Z21Sim ignores
  LAN_X_SET_LOCO_E_STOP, so it is never sent alone).
- Open, decided after the user's hardware test: whether Resume / Track power on should first set
  the on-screen locos to 0. The simulator keeps loco speeds through STOP, so locos run again on
  Resume. Until then, the app does not change speeds on Resume.
- Displayed loco state must never claim something the central unit has not confirmed: pending
  changes expire after `LOCAL_CHANGE_HOLD_MS`, and the app re-requests loco info after track
  status changes and per-loco stops.
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
