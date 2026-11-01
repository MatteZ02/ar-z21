# Throttle

A phone and tablet app for driving model trains with a Roco **Z21**, **z21** or **z21 start**
central unit. It talks directly to the central unit over the layout's Wi-Fi, using the Z21 LAN
protocol. There is no server, no account and no data collection.

Made by Alppirautatiet for its members, as an open-source replacement for the Roco Z21 app's
driving features.

## Features

- **Driving:** speed slider, direction, a STOP for each loco, function buttons with names and
  icons (latching or momentary), speed shown in km/h, mph or speed steps.
- **Global STOP** always at the top of the screen: one tap stops all trains; tap twice quickly to
  also switch the track power off (configurable). Track status, including short circuits, is
  shown clearly.
- **Vehicle library:** locos with photo, address, speed steps, function layout and details;
  search, sort, duplicate.
- **Consists:** several locos driven as one train, each with its own direction and speed
  difference.
- **Quick switching** between recently driven locos, and **two throttles side by side** on
  tablets in landscape.
- **Import** of locos, photos, functions and consists from a Roco Z21 app export (`.z21` file).
- Shows when another controller drives the same loco. Light and dark mode, large touch targets.

## Supported central units

Tested with a Roco **z21 start** (firmware 1.33). Other Roco Z21 central units use the same
protocol.

## Installation

Instructions for members: see the installation guide (Finnish and English, coming soon).
Android builds are published on the [Releases](../../releases) page.

## Screenshots

_Coming soon._

## Help and feedback

Please report problems and ideas as [GitHub Issues](../../issues).

## For developers

Expo / React Native / TypeScript. See [docs/development.md](docs/development.md) for setup on
Windows, testing against a Z21, and building releases, and [CLAUDE.md](CLAUDE.md) for the
architecture and conventions.

## Licence

[MIT](LICENSE). Throttle is not affiliated with Modelleisenbahn GmbH (Roco). "Z21" is a trademark
of its owner and is used only to name the supported devices.
