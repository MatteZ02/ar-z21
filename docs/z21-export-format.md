# Roco Z21 app export format (`.z21`)

Findings from inspecting one real export, `docs/reference/z21_layout_import.z21` (21 MB, created
by the Roco Z21 app for iOS, build 1.4.2, database version 15). Only one sample has been seen;
treat everything here as observed, not specified. The importer (Phase 5) must tolerate missing
tables, columns and files.

## Container

- A **zip** archive (deflate). Entries live under `export/<UUID>/`:
  - `Loco.sqlite`: an SQLite database (text encoding UTF-8);
  - `<UUID>.png`: images, all about 500 × 200 px. 80 of 109 are vehicle photos
    (`vehicles.image_name`); the other 29 are not referenced by any table of interest. The small
    ~8 KB files are ordinary 500 × 200 photos too (4 are used by vehicles).
- Nothing else (no manifest).

## Importer decisions (user, 2026-10-31)

- Wagons (`type` 1) are imported as locos: they have addresses and functions (control cars).
- No speed-step mode in the export: imported locos get 128 steps.
- Vehicles with a duplicate address exist (address 3 three times, 95 twice); the duplicate
  handling (skip, replace, keep both) applies per vehicle.

## Tables relevant to this app

### `vehicles` (82 rows)

| Column                                                                                                                                                                                                 | Observed meaning                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                                                                                                                                                   | Primary key, referenced by `functions.vehicle_id`, `train_list`, `traction_list.loco_id`                                              |
| `name`                                                                                                                                                                                                 | Display name, UTF-8 (may contain typographic quotes, `ä`, …)                                                                          |
| `image_name`                                                                                                                                                                                           | File name of the photo in the same zip folder, or empty / NULL                                                                        |
| `type`                                                                                                                                                                                                 | `0` loco (78 rows), `1` probably wagon (3), `3` train = consist (1). `2` probably accessory (the app offers Loco / Wagon / Accessory) |
| `address`                                                                                                                                                                                              | DCC address                                                                                                                           |
| `max_speed`                                                                                                                                                                                            | Top speed in km/h (60–300) for the speed display                                                                                      |
| `speed_display`                                                                                                                                                                                        | `0` km/h, `1` regulation (speed) step; `2` probably mph (not seen)                                                                    |
| `active`                                                                                                                                                                                               | `1` for all rows ("Active" switch in the app)                                                                                         |
| `position`                                                                                                                                                                                             | Order in the vehicle list                                                                                                             |
| `traction_direction`                                                                                                                                                                                   | `1` = "multi traction driving direction inverted" (consist member reversed)                                                           |
| `dummy`                                                                                                                                                                                                | `1` on the "Demo loco"                                                                                                                |
| `crane`                                                                                                                                                                                                | "Crane" switch                                                                                                                        |
| `full_name`, `railway`, `buffer_lenght` (sic), `model_buffer_lenght`, `service_weight`, `model_weight`, `rmin`, `article_number`, `decoder_type`, `owner`, `build_year`, `owning_since`, `description` | Free-text detail fields of the "Data" tab                                                                                             |
| `drivers_cab`, `ip`, `video*`, `panorama*`, `direct_steering`                                                                                                                                          | Camera / cab view features (out of scope)                                                                                             |

There is **no speed-step column**: the Roco app does not store 14/28/128 per loco.

### `functions` (206 rows)

| Column                 | Observed meaning                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vehicle_id`           | Owning vehicle                                                                                                                                                        |
| `function`             | Function number (F0–F27 seen)                                                                                                                                         |
| `position`             | Slot in the function grid. Pages of 12 slots (CI = 0–11, CII = 12–23, CIII = 24–35), each page two columns of six, filled **column by column**. Gaps are empty slots. |
| `button_type`          | `0` latching (149), `1` momentary (57). The horns are `1`.                                                                                                            |
| `time`                 | `'0.0'` / `'0.000000'`; once `'5.000000'` (probably a timed function; meaning to confirm)                                                                             |
| `image_name`           | Roco icon identifier, 48 distinct, e.g. `main_beam`, `sound1`, `horn_high`, `door_open`, `couple`, `mute`, `empty`                                                    |
| `shortcut`             | Function name shown with the number, e.g. `Tunnelmode`; usually empty                                                                                                 |
| `show_function_number` | `1` everywhere                                                                                                                                                        |
| `is_configured`        | `0` everywhere                                                                                                                                                        |

### `train_list` (2 rows): consist members

`train_id` → `vehicles.id` of the train (type 3), `vehicle_id` → member, `position` → order.
The one sample consist ("Double vectron", address 3) has two members.

### `traction_list` (21 rows): speed measurements

`loco_id`, `regulation_step` (10, 20, … 100), `time` in seconds ("Time capture" on the Traction
tab). Out of scope for v1.

### Other tables

`categories` and `vehicles_to_categories` (empty in the sample), `dc_functions` (empty),
`control_station_*` (switching panel layout; out of scope), `layout_data` (layout name),
`paired_z21_pro_links`, `update_history`.
