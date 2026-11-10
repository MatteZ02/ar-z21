# App Store Connect: what to enter

Drafts for the App Store Connect record, so it can be filled in as soon as the Apple Developer
membership is active. Character limits are Apple's. Edit freely; nothing here is final.

## App record (My Apps → +)

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Platform         | iOS                                                                          |
| Name             | see below                                                                    |
| Primary language | English (U.S.) (the app is in English only)                                  |
| Bundle ID        | `fi.alppirautatiet.throttle` (registered by the first EAS build, or by hand) |
| SKU              | `throttle` (internal only, never shown)                                      |
| User access      | Full access                                                                  |

**Name (max 30, must be unique in the whole App Store).** "Throttle" alone is almost certainly
taken. The name on the home screen stays "Throttle" either way (it comes from `app.json`).
Suggestions:

- `Throttle – Model Train Control` (30)
- `Throttle for Model Railways` (27)

Avoid "Roco" and "Z21" in the name, subtitle and keywords: Apple rejects metadata that uses
someone else's trademark as if it were the app's own. The description may say what the app is
compatible with.

## Version page

**Subtitle (max 30):** `Drive your model trains` (23)

**Promotional text (max 170, can be changed without review):**

> Drive the trains on your layout from your phone or tablet: speed, direction, functions and a
> STOP that is always in reach.

**Description (max 4000):**

> Throttle drives model trains on a DCC layout from your iPhone or iPad. It connects directly to
> the layout's central unit over Wi-Fi. There is no account, no server and no data collection.
>
> Compatible with Roco Z21, z21 and z21 start central units (LAN protocol).
>
> DRIVING
> • Speed slider, direction and a STOP for each loco
> • Function buttons with names and icons, latching or momentary
> • Speed shown in km/h, mph or speed steps
> • Shows when another controller drives the same loco
>
> SAFETY
> • A global STOP at the top of every driving screen: one tap stops all trains, a quick second
> tap also switches the track power off
> • Track status and short circuits are shown clearly
>
> VEHICLE LIBRARY
> • Locos with photo, address, speed steps, function layout and details
> • Consists: several locos driven as one train, each with its own direction and speed difference
> • Import locos, photos, functions and consists from a Roco Z21 app export
>
> ON THE TABLET
> • Two throttles side by side in landscape
>
> Made by Alppirautatieharrastajat ry for its members. Open source (MIT).
> Throttle is not affiliated with Modelleisenbahn GmbH (Roco). "Z21" is a trademark of its owner.

**Keywords (max 100, comma-separated, no spaces needed):**
`model railway,model train,DCC,locomotive,train control,layout,consist,digital,railroad`
(86)

**Support URL:** `https://github.com/MatteZ02/ar-z21/issues`

**Marketing URL (optional):** `https://github.com/MatteZ02/ar-z21`

**Copyright:** `2026 Alppirautatieharrastajat ry`

**Version:** taken from the build (`version` in `app.json`).

**Screenshots:** required for iPhone 6.9" (1320 × 2868 or 1290 × 2796) and, because the app
supports iPad, iPad 13" (2064 × 2752 or 2048 × 2732). 1–10 each. Take them from a TestFlight
build on a real device (screen of a driving loco, library, consist, tablet split screen). Use
the club's own loco photos, not Roco's.

## App information

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Category           | Primary: Utilities; secondary: Entertainment                 |
| Content rights     | Does not contain, show or access third-party content         |
| Age rating         | Answer "None" / "No" to every question → 4+                  |
| Privacy policy URL | `https://github.com/MatteZ02/ar-z21/blob/release/PRIVACY.md` |

The privacy policy URL must open without a login, so it works only while the repository is
public. If it is private, publish `PRIVACY.md` elsewhere (e.g. the club website or GitHub
Pages) and use that URL.

## App Privacy

**Data collection: "No, we do not collect data from this app."** This matches
[PRIVACY.md](../PRIVACY.md): nothing leaves the device except commands to the central unit on
the local network, which is the user's own device and not collection by the developer.

## Pricing and availability

- Price: free.
- Availability: all countries, or only Finland (the club's choice).
- **Unlisted distribution:** after the first version is approved, request it with Apple's
  "Unlisted app distribution" form. The app is then only reachable through its link and does
  not appear in search. TestFlight works before that.

## Export compliance

Already answered in the build (`ITSAppUsesNonExemptEncryption: false` in `app.json`): the app
uses no encryption. App Store Connect does not ask again.

## App Review information

- **Sign-in required:** no.
- **Contact:** the person submitting (name, phone, e-mail; not shown publicly).
- **Notes** (Apple's reviewers have no model railway, so explain and show a video):

> Throttle is a controller for model railways. It needs a Roco Z21 / z21 / z21 start digital
> central unit on the same Wi-Fi network; it sends driving commands to it over UDP on the local
> network (hence the Local Network permission). There is no account and no server.
>
> Without a central unit the app opens normally, shows "Offline" and keeps trying to connect;
> the vehicle library, loco editor, consist editor and import can be used without one.
>
> A video of the app driving a real layout: <link>

Record a short video (1–2 minutes, on the phone, of the app and the moving train side by side)
and put it somewhere viewable without a login, e.g. an unlisted YouTube video. Apps that need
hardware are often rejected under guideline 2.1 ("could not review") without one.

## TestFlight

- **Internal testers** (people added as users in App Store Connect, up to 100) can install a
  build right away, without review.
- **External testers** (members, by e-mail or a public link, up to 10 000) need a short beta
  review of the first build. It asks for "What to test", a feedback e-mail and the same review
  notes as above.
- Builds expire after 90 days; members then need a newer build (or the App Store version).
