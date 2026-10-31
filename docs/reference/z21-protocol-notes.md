# Z21 LAN protocol: notes for version 1

A navigation aid for the messages this app uses in version 1. **The specification is the
source of truth**: _Z21 LAN Protocol Specification_, document version 1.13 en (06.11.2023),
covering Z21 firmware up to 1.43 (`docs/reference/z21-lan-protokoll-en_1.13.pdf`). Section
numbers (§) and page numbers (p.) below refer to that PDF. If these notes and the PDF disagree,
the PDF wins; fix the notes.

Worked examples were computed from the rules in the spec and checked against its tables. They
are good candidates for byte-exact unit tests.

## Conventions

- **Direction**: C→Z = client (this app) to central unit; Z→C = central unit to client.
  BC = broadcast, which is only sent if the matching broadcast flag is set.
- Bytes are hex. `XOR` = the X-Bus checksum byte.

## 1. Framing

| Item                            | Layout                                                                                                                                         | Spec        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Dataset                         | `DataLen(u16 LE) Header(u16 LE) Data(n)`. **DataLen = 4 + n** (includes itself). Unless stated otherwise, multi-byte values are little-endian. | §1.2.1 p. 8 |
| X-Bus tunnel                    | Header `0x40 0x00`. Data = `X-Header DB0 … DBn XOR`. **XOR = X-Header ⊕ DB0 ⊕ … ⊕ DBn.**                                                       | §1.2.2 p. 9 |
| Several datasets per UDP packet | Allowed in **both directions**. Receivers must split by DataLen. Payload ≤ 1472 bytes (Ethernet MTU).                                          | §1.3 p. 10  |
| Port                            | UDP 21105 (primary) or 21106. Apps should use 21105.                                                                                           | §1.1 p. 8   |
| Asynchrony                      | Broadcasts may arrive between a request and its reply.                                                                                         | §1.1 p. 8   |

### Loco address encoding (used by all loco messages)

Two bytes, **big-endian**: `Adr_MSB Adr_LSB`. Address = `(Adr_MSB & 0x3F) << 8 | Adr_LSB`.
**For addresses ≥ 128, send `Adr_MSB | 0xC0`.** Below 128 the top two bits have no meaning
(send 0). When decoding, ignore the top two bits. (§4.1 p. 23, repeated in each loco command.)

- Address 3 → `00 03`.
- Address 1234 (0x04D2) → `C4 D2`.

## 2. Session: login, keepalive, logoff, broadcast flags

| Message                | Dir | Bytes                                                                                                                                                                                                                         | Reply                        | Spec            |
| ---------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------- |
| _Login_                | –   | **There is no login message.** The client is registered implicitly by its first command.                                                                                                                                      | –                            | §2.2 note p. 11 |
| _Keepalive_            | C→Z | **There is no dedicated message.** The client must talk to the Z21 at least once a minute or it is removed from the active clients. Any command counts. Decision: LAN_X_GET_STATUS when nothing else has been sent for ~25 s. | –                            | §1.1 p. 8       |
| LAN_LOGOFF             | C→Z | `04 00 30 00`                                                                                                                                                                                                                 | none                         | §2.2 p. 11      |
| LAN_SET_BROADCASTFLAGS | C→Z | `08 00 50 00 <flags u32 LE>`, e.g. basic only = `08 00 50 00 01 00 00 00`                                                                                                                                                     | none                         | §2.16 pp. 16–17 |
| LAN_GET_BROADCASTFLAGS | C→Z | `04 00 51 00`                                                                                                                                                                                                                 | `08 00 51 00 <flags u32 LE>` | §2.17 p. 17     |

Notes:

- **Logoff must be sent from the same port used for login.** In practice that means the same
  socket. (§2.2)
- **Broadcast flags are stored per client (IP + port) and must be set again at every login.**
  After a reconnect, after a timeout caused by being in the background, or after a port change,
  always re-send them. (§2.16)

### Broadcast flags relevant to this app (§2.16 p. 16–17)

| Flag         | Meaning                                                                                                                                      | Use                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `0x00000001` | Driving/switching broadcasts: track power on/off, programming mode, short circuit, stopped, LOCO_INFO for **subscribed** locos, turnout info | **Always on**                                                                                      |
| `0x00000100` | LAN_SYSTEMSTATE_DATACHANGED broadcasts (currents, temperature, …)                                                                            | Optional, **off by default**. The spec itself recommends `0x1` instead.                            |
| `0x00010000` | LOCO_INFO for **all** locos, without subscribing                                                                                             | **Never.** The spec says it is "NOT intended for mobile hand controllers under any circumstances". |

## 3. Device info (shown on connect; all optional, so tolerate no reply)

| Message                    | Dir | Bytes                  | Reply                                                                                                              | Spec        |
| -------------------------- | --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| LAN_GET_SERIAL_NUMBER      | C→Z | `04 00 10 00`          | `08 00 10 00 <serial u32 LE>`                                                                                      | §2.1 p. 11  |
| LAN_GET_HWINFO (FW ≥ 1.20) | C→Z | `04 00 1A 00`          | `0C 00 1A 00 <HwType u32 LE> <FW u32 LE, BCD>`. Example: `… 00 02 00 00 20 01 00 00` = HW 0x200, FW 1.20           | §2.20 p. 19 |
| LAN_X_GET_FIRMWARE_VERSION | C→Z | `07 00 40 00 F1 0A FB` | `09 00 40 00 F3 0A <V_MSB> <V_LSB> XOR` (BCD). Example `… F3 0A 01 23 DB` = 1.23                                   | §2.15 p. 15 |
| LAN_X_GET_VERSION          | C→Z | `07 00 40 00 21 21 00` | `09 00 40 00 63 21 <XBUS_VER> <CMDST_ID> XOR`. `CMDST_ID 0x12` = Z21 family                                        | §2.3 p. 11  |
| LAN_GET_CODE               | C→Z | `04 00 18 00`          | `05 00 18 00 <code>`: `00` no lock, `01` **z21 start locked (driving/switching blocked)**, `02` z21 start unlocked | §2.21 p. 20 |

HwType values (§2.20): `0x200` black Z21 (2012), `0x201` black Z21 (2013), `0x202` SmartRail,
`0x203` white z21, `0x204` z21 start, `0x211` Z21 XL. Booster and decoder IDs (`0x205`, `0x206`,
`0x212`, `0x301`, `0x302`) are zLink devices, not central units.

## 4. Track power, emergency stop and status

| Message                      | Dir    | Bytes                            | Reply / notes                                                                                | Spec        |
| ---------------------------- | ------ | -------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| LAN_X_GET_STATUS             | C→Z    | `07 00 40 00 21 24 05`           | LAN_X_STATUS_CHANGED                                                                         | §2.4 p. 12  |
| LAN_X_STATUS_CHANGED         | Z→C    | `08 00 40 00 62 22 <status> XOR` | Status bitmask below. Same as SystemState.CentralState.                                      | §2.12 p. 14 |
| LAN_X_SET_TRACK_POWER_OFF    | C→Z    | `07 00 40 00 21 80 A1`           | BC_TRACK_POWER_OFF                                                                           | §2.5 p. 12  |
| LAN_X_SET_TRACK_POWER_ON     | C→Z    | `07 00 40 00 21 81 A0`           | BC_TRACK_POWER_ON. **Also ends emergency stop and programming mode.**                        | §2.6 p. 12  |
| LAN_X_SET_STOP               | C→Z    | `06 00 40 00 80 80`              | BC_STOPPED. Emergency stop: **all locos stop, track stays powered.**                         | §2.13 p. 15 |
| LAN_X_BC_TRACK_POWER_OFF     | Z→C BC | `07 00 40 00 61 00 61`           | flag 0x1                                                                                     | §2.7 p. 13  |
| LAN_X_BC_TRACK_POWER_ON      | Z→C BC | `07 00 40 00 61 01 60`           | flag 0x1                                                                                     | §2.8 p. 13  |
| LAN_X_BC_PROGRAMMING_MODE    | Z→C BC | `07 00 40 00 61 02 63`           | flag 0x1                                                                                     | §2.9 p. 13  |
| LAN_X_BC_TRACK_SHORT_CIRCUIT | Z→C BC | `07 00 40 00 61 08 69`           | flag 0x1                                                                                     | §2.10 p. 13 |
| LAN_X_BC_STOPPED             | Z→C BC | `07 00 40 00 81 00 81`           | flag 0x1                                                                                     | §2.14 p. 15 |
| LAN_X_UNKNOWN_COMMAND        | Z→C    | `07 00 40 00 61 82 E3`           | Reply to an invalid request. Useful for detecting unsupported commands on third-party units. | §2.11 p. 14 |

Central state bitmask (§2.12 p. 14, §2.18 p. 18):

| Bit    | Name                    | App status       |
| ------ | ----------------------- | ---------------- |
| `0x01` | csEmergencyStop         | Emergency stop   |
| `0x02` | csTrackVoltageOff       | Track power off  |
| `0x04` | csShortCircuit          | Short circuit    |
| `0x20` | csProgrammingModeActive | Programming mode |

Several bits can be set at once. The UI should show the most severe: short circuit > power off >
emergency stop > programming.

## 5. System state (on demand only)

| Message                     | Dir | Bytes                                | Spec        |
| --------------------------- | --- | ------------------------------------ | ----------- |
| LAN_SYSTEMSTATE_GETDATA     | C→Z | `04 00 85 00`                        | §2.19 p. 19 |
| LAN_SYSTEMSTATE_DATACHANGED | Z→C | `14 00 84 00` + 16 bytes SystemState | §2.18 p. 18 |

SystemState (16-bit values little-endian):

| Offset | Type | Field                                                                                                                                                                                       |
| ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | i16  | MainCurrent (mA)                                                                                                                                                                            |
| 2      | i16  | ProgCurrent (mA)                                                                                                                                                                            |
| 4      | i16  | FilteredMainCurrent (mA)                                                                                                                                                                    |
| 6      | i16  | Temperature (°C)                                                                                                                                                                            |
| 8      | u16  | SupplyVoltage (mV)                                                                                                                                                                          |
| 10     | u16  | VCCVoltage (mV), equal to the track voltage                                                                                                                                                 |
| 12     | u8   | CentralState (bitmask as in section 4)                                                                                                                                                      |
| 13     | u8   | CentralStateEx: `0x01` high temp, `0x02` power lost, `0x04` short circuit external, `0x08` short circuit internal, `0x20` RCN-213 (FW 1.42)                                                 |
| 14     | u8   | reserved                                                                                                                                                                                    |
| 15     | u8   | Capabilities (FW ≥ 1.42; **0 = older FW, do not evaluate**): `0x01` DCC, `0x02` MM, `0x08` RailCom, `0x10` loco cmds, `0x20` accessory cmds, `0x40` detector cmds, `0x80` needs unlock code |

## 6. Driving

Subscriptions (§4 intro, p. 23): **LAN_X_GET_LOCO_INFO both polls and subscribes** (when flag 0x1
is set). **Maximum 16 subscribed locos per client, FIFO**: the 17th pushes out the oldest, with no
notification. The app must track its own subscription list.

| Message                           | Dir              | Bytes                                                      | Spec         |
| --------------------------------- | ---------------- | ---------------------------------------------------------- | ------------ |
| LAN_X_GET_LOCO_INFO               | C→Z              | `09 00 40 00 E3 F0 <Adr_MSB> <Adr_LSB> XOR`                | §4.1 p. 23   |
| LAN_X_SET_LOCO_DRIVE              | C→Z              | `0A 00 40 00 E4 <0x1S> <Adr_MSB> <Adr_LSB> <RVVVVVVV> XOR` | §4.2 p. 24   |
| LAN_X_SET_LOCO_FUNCTION           | C→Z              | `0A 00 40 00 E4 F8 <Adr_MSB> <Adr_LSB> <TTNNNNNN> XOR`     | §4.3.1 p. 25 |
| LAN_X_SET_LOCO_E_STOP (FW ≥ 1.43) | C→Z              | `08 00 40 00 92 <Adr_MSB> <Adr_LSB> XOR`                   | §4.5 p. 29   |
| LAN_X_LOCO_INFO                   | Z→C (reply + BC) | `<7+n> 00 40 00 EF DB0 … DBn XOR`                          | §4.4 p. 28   |

None of the C→Z driving commands has a direct reply. The result arrives as LAN_X_LOCO_INFO, and
only to subscribed clients.

Examples:

- GET_LOCO_INFO addr 3 → `09 00 40 00 E3 F0 00 03 10`
- GET_LOCO_INFO addr 1234 → `09 00 40 00 E3 F0 C4 D2 05`
- E_STOP addr 3 → `08 00 40 00 92 00 03 91`

### Speed steps and speed byte (§4.2 p. 24)

`0x1S`: **S = 0 → 14 steps (`0x10`), S = 2 → 28 steps (`0x12`), S = 3 → 128 steps (`0x13`).**
In LOCO_INFO DB2 the same information is `KKK`: **0 = 14, 2 = 28, 4 = 128.** Note the
different codes. The Z21 stores the step mode per address persistently when a drive command is sent.

Speed byte `RVVVVVVV`: **R = 1 means forward.**

| Mode | Stop | E-Stop | Step n → V                                                                                                                           |
| ---- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 14   | `0`  | `1`    | `n + 1` (n = 1…14 → 2…15). Bits 4–6 are 0.                                                                                           |
| 28   | `0`  | `1`    | let `v = n + 3`; **V = (v >> 1) \| ((v & 1) << 4)**. n = 1 → `0x02`, 2 → `0x12`, 3 → `0x03`, 4 → `0x13`, … 27 → `0x0F`, 28 → `0x1F`. |
| 128  | `0`  | `1`    | `n + 1` (n = 1…126 → 2…127)                                                                                                          |

28 steps: bit 4 holds the _least significant_ bit of the intermediate step (the NMRA "C" bit).
The table also lists `0x10` "Stop1" and `0x11` "E-Stop1", marked "usage not recommended".
**Never send them; decode them as stop and e-stop.**

Examples:

- addr 3, 128 steps, forward, step 64 → `0A 00 40 00 E4 13 00 03 C1 35`
- addr 1234, 28 steps, reverse, step 10 → `0A 00 40 00 E4 12 C4 D2 16 F6`
- addr 3, 14 steps, forward, step 5 → `0A 00 40 00 E4 10 00 03 86 71`

### Functions (§4.3 p. 25)

`TTNNNNNN`: TT `00` = off, `01` = on, `10` = toggle, `11` = invalid. N = function index (0 = F0).
F0–F28 are supported; F29–F31 need FW ≥ 1.42.

- F0 on, addr 3 → `0A 00 40 00 E4 F8 00 03 40 5F`
- F12 toggle, addr 3 → `0A 00 40 00 E4 F8 00 03 8C 93`

F0–F12 are refreshed on the track continuously. F13 and above are sent three times after a change
and then not repeated (RCN-212).

**LAN_X_SET_LOCO_FUNCTION_GROUP (§4.3.2 p. 26) is deliberately not used.** It sets a whole group
at once and can switch off functions turned on by another controller. The spec itself recommends
it only for PC automation software. Toggle (`TT = 10`) is also avoided: send explicit on/off from
the known state, so that a lost packet cannot invert a function.

### LAN_X_LOCO_INFO layout (§4.4 p. 28)

| Byte | Content                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| DB0  | Adr_MSB (ignore top 2 bits)                                                                                                                    |
| DB1  | Adr_LSB                                                                                                                                        |
| DB2  | `0000 BKKK`: **B = 1: controlled by another X-BUS handset ("busy")**; KKK = steps (0/2/4). FW 1.43 adds an M bit (MM format); see ambiguity 4. |
| DB3  | `RVVVVVVV`: direction and speed, coded per KKK as above                                                                                        |
| DB4  | `0DSLFGHJ`: D = double traction, S = smartsearch, L = F0, F = F4, G = F3, H = F2, J = F1                                                       |
| DB5  | F5–F12 (F5 = bit 0)                                                                                                                            |
| DB6  | F13–F20 (F13 = bit 0)                                                                                                                          |
| DB7  | F21–F28 (F21 = bit 0)                                                                                                                          |
| DB8  | F29–F31 (F29 = bit 0). Only with FW ≥ 1.42 **and** DataLen ≥ 15.                                                                               |
| DBn  | optional future extensions. Ignore.                                                                                                            |

## 7. Ambiguities and spec quirks

1. **No login handshake.** Registration is implicit with the first command (§2.2), and clients are
   dropped after about 60 s of silence (§1.1). "Connected" therefore means "we have sent something
   and received a reply recently". It has to be inferred from replies, for example to
   GET_STATUS.
2. **Broadcast flags are lost on re-login** (they are stored per IP + port, §2.16). Always re-send
   them after reconnecting.
3. **The busy bit B covers X-BUS handsets only** (e.g. multiMaus), not other LAN clients (§4.4). To
   detect other app instances driving the same loco, the app must also notice LOCO_INFO changes it
   did not cause (brief §6.3 fallback). This fallback is the main mechanism, not an edge case.
4. **M bit position not specified.** DB2 is drawn as `0000 BKKK`, but the text says "M=1 … from FW
   1.43 identifies loco with MM output format" without showing which bit. Most likely bit 4
   (`000M BKKK`), but this is unconfirmed. Ignore it in v1.
5. **LOCO_INFO length.** The text says "7 ≤ n ≤ 14", with DataLen = 7 + n; it also says "from FW 1.42
   DataLen is ≥ 15 (n ≥ 8)". The two are not fully consistent. Parse DB0–DB7 as required (DataLen ≥ 14) and DB8 only when present; ignore extra bytes. Treat a shorter dataset as malformed but do
   not crash.
6. **E_STOP byte labels.** §4.5 labels the bytes "DB0 DB2" and its address note mentions DB1. From
   DataLen 0x08, the address is clearly DB0 = Adr_MSB and DB1 = Adr_LSB.
7. **E_STOP needs FW ≥ 1.43.** On older firmware, or on units that reply LAN_X_UNKNOWN_COMMAND, fall
   back to LAN_X_SET_LOCO_DRIVE with speed value `1` (E-Stop), keeping the current direction. This
   fallback is valid for all three step modes.
8. **DCC 14 bit 4.** Raw NMRA 14-step packets carry FL in bit 4; the Z21 table shows it as 0. Follow
   the spec: send 0 and control F0 with SET_LOCO_FUNCTION.
9. **"Stop1"/"E-Stop1" in the 28-step table** (see section 6). Decode them, never encode them.
10. **Different step codes** in DRIVE (`S` = 0/2/3) and LOCO_INFO (`KKK` = 0/2/4). Easy to mix up.
11. **§2.12 wording.** "if the client explicitly sets the status" should read "requests" (via
    LAN_X_GET_STATUS). It is a translation slip.
12. **Address range.** The encoding allows 0–16383; DCC long addresses go up to 10239. The address
    0xC0 flag rule uses ≥ 128, so addresses 1–127 are always sent as short addresses.
13. **LAN_X_SET_LOCO_BINARY_STATE** (out of scope) has DataLen 0x0A in the table, but its bytes
    add up to 0x0B. Noted in case it is added later.
14. **"Login" with port.** Logoff must come from the login port (§2.2), and flags are per IP + port.
    On Android/iOS, closing and reopening the socket usually gets a new ephemeral port, so the Z21
    sees a new client. The old one times out after about 60 s and is harmless, but every reopen
    must redo the full connect sequence.

15. **Re-requesting a subscribed loco.** The spec does not say whether sending LAN_X_GET_LOCO_INFO
    again for an already subscribed address moves it to the back of the 16-loco FIFO. The app
    assumes it does **not**. If that is wrong, the app only re-requests a loco slightly earlier
    than needed; it never misses updates. (`src/connection/subscriptions.ts`)

16. **Loco state after STOP and after power returns is not specified.** §2.13 only says the locos
    are stopped. The spec does not say whether the central unit keeps each loco's speed (so it
    runs again after LAN_X_SET_TRACK_POWER_ON), or whether it sends LAN_X_LOCO_INFO after
    BC_STOPPED. The app therefore asks for the state of the on-screen locos after every change of
    track status (`ConnectionManager.handleMessage`). **To verify on real hardware.**

## 7a. Observed behaviour of the Z21Sim simulator (2026-10-31)

The dummy server is `Z21Sim` in Docker (`z21sim-webui`, UDP 21105, web UI on port 6080). It
reports hardware type `0x204` (z21 start) and firmware 1.43. Compared with the spec:

- Status, track power on/off, LAN_X_SET_STOP, HWINFO, GET_CODE, GET_LOCO_INFO, SET_LOCO_DRIVE and
  SET_LOCO_FUNCTION behave as specified. LOCO_INFO includes DB8 (F29–F31, DataLen 0x0F).
- **LAN_X_SET_LOCO_E_STOP (0x92) is silently ignored**: no reply, no LAN_X_UNKNOWN_COMMAND, and
  the loco keeps its speed, although it reports firmware 1.43.
- **After LAN_X_SET_STOP the loco keeps its speed**, and no LOCO_INFO is broadcast. After
  LAN_X_SET_TRACK_POWER_ON the loco still has its old speed, i.e. it would run again.

Whether a real z21 start behaves the same is not known yet.

## 8. Version differences

Only document version 1.13 is available. Its revision history (p. 3) shows which **firmware**
added each feature this app touches:

| Feature                                                  | Min FW | Doc version       |
| -------------------------------------------------------- | ------ | ----------------- |
| LAN_GET_HWINFO, broadcast flag 0x10000                   | 1.20   | 1.01              |
| F13–F28 via FUNCTION_GROUP                               | 1.24   | (§4.3.2 remark B) |
| LAN_GET_CODE (z21 start lock)                            | 1.28   | 1.06              |
| F29–F31, SystemState.Capabilities, LOCO_INFO DB8         | 1.42   | 1.12              |
| LAN_X_SET_LOCO_E_STOP, LAN_X_PURGE_LOCO, LOCO_INFO M bit | 1.43   | 1.13              |

Third-party units (DR5000) may implement an older subset of this. To check against the DR5000
documentation once it is available:

- HWINFO and GET_CODE replies.
- E_STOP support.
- F29–F31.
- SystemState.
- Whether it packs several datasets per UDP packet.

## 9. Out of scope for v1 (for later reference)

| Area                     | Where        |
| ------------------------ | ------------ |
| Turnouts and accessories | §5 pp. 30–36 |
| CV programming and POM   | §6 pp. 37–44 |
| R-Bus feedback           | §7           |
| RailCom                  | §8           |
| LocoNet                  | §9           |
| CAN                      | §10          |
| zLink                    | §11          |
| Fast clock               | §12          |
| Loco mode DCC/MM         | §3           |
| Purge loco               | §4.6         |
| Binary states            | §4.3.3       |

Appendix A (pp. 76–77) is a one-page index of all commands, including which devices support each.
