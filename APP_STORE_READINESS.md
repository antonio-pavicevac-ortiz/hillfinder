# App Store readiness

How Hillfinder becomes an iPhone app. Android is out of scope for now (see the Results
section of `mobile-spike/README.md`).

## Decision

Wrap the existing site in Capacitor. The locked-screen spike passed on iPhone: GPS about
once a second and spoken prompts every 30 seconds for a 29-minute locked walk. React
Native/Expo would mean rewriting the app, and the spike gave no reason to.

## How the app loads Hillfinder

The app is a native shell that loads `https://hillfinder.io` (Capacitor `server.url`).
Sign-in (NextAuth), the database and the API routes need the server, so the site can't be
exported as static files and bundled into the app.

Consequences:

- Web changes reach the app on the next Vercel deploy, with no new App Store build.
- The app needs a connection to start. Riding already needs one for routing and map tiles.
- Native plugins are called from the site's own code. Their JS packages go in the root
  `package.json`, and the code checks `Capacitor.isNativePlatform()` so the website keeps
  using browser APIs.

## Work, in PR order

### 1. Native shell

- Add Capacitor to the root project with the iOS project in `ios/`. The root Next.js build
  is unaffected.
- `capacitor.config`: `server.url` set to `https://hillfinder.io`, bundle ID
  `io.hillfinder` (hillfinder.io reversed; it can't be changed after the first upload),
  app name Hillfinder.
- Info.plist: background modes for location and audio, and location permission text
  (reuse the wording from the spike).
- App icon and launch screen from `public/hillfinder-app-icon.png`.
- Don't register the service worker inside the app. WKWebView only allows service workers
  for app-bound domains, and the shell has no offline mode to support.

Done when the app opens on the iPhone and the map, routes and email sign-in work.

### 2. Native location and speech

Navigation uses `navigator.geolocation` and `speechSynthesis`. In WKWebView both stop
when the phone locks. Add one small module, `src/lib/native/`, that uses the spike's
plugins in the app and the browser APIs on the web:

- `watchLocation(onPosition)`, replacing `watchPosition`/`clearWatch` in
  `DashboardMap.tsx`. In the app, the background watcher runs only while navigating, so
  "Always" location is requested when the rider taps Start, not on first launch.
- `getLocationOnce()`, replacing the two `getCurrentPosition` calls in `DashboardMap.tsx`.
- `speak(text)` / `stopSpeaking()`, replacing the `speechSynthesis` calls in
  `Dashboard.tsx` (step instructions, system prompts, route narration, and the cancels on
  End and mute). Step instructions mark themselves spoken in `utterance.onstart` today; the
  native version marks them when `speak` is called.

Guidance is already driven by the GPS callback (step progress, off-route, head to the
start), which matches what the spike proved. In the spike, React state updates and timers
also kept running while locked. Confirm that holds for the real app in step 5.

### 3. Sign-in

Google blocks its sign-in page inside embedded WebViews (`disallowed_useragent`). App
Store guideline 4.8 also requires Sign in with Apple, or an equivalent private option,
when an app offers Google sign-in.

For the first release, hide "Continue with Google" (`SignInPage.tsx`) and the Google
connection settings (`GoogleConnectionSection.tsx`) inside the app. Email and password
work as they are. Riders who signed up with Google add a password under Profile on the
website, where they're signed in with Google. Forgot password deliberately skips accounts
without a password, so it can't do this.

Later, if Google sign-in is wanted in the app, it needs a system-browser sign-in flow that
hands the session back to the app, plus Sign in with Apple.

### 4. App Store requirements

Done in code:

- `ios/App/App/PrivacyInfo.xcprivacy`: no tracking, no required-reason APIs, and the data
  types listed under App Privacy below.
- Info.plist: `ITSAppUsesNonExemptEncryption` is false (standard HTTPS only), so uploads
  skip the export-compliance question; the app requires arm64.
- The privacy policy says location continues while the phone is locked, only during a
  ride the rider started.
- Release builds fail unless the app loads `https://hillfinder.io` (a "Check release
  server" build phase), so a dev-server URL can't ship.
- Account deletion in the app (guideline 5.1.1(v)) already exists in Settings.

Needs the Apple Developer Program membership ($99/year; the free account's installs
expire after 7 days and can't use TestFlight or the App Store):

1. In the Apple Developer site, register the bundle ID `io.hillfinder`.
2. In Xcode, choose the paid team for the Release configuration (Signing & Capabilities).
3. In App Store Connect, create the app: name Hillfinder, bundle ID `io.hillfinder`,
   primary category Navigation, secondary Sports.
4. Fill in App Privacy as below, the privacy policy URL `https://hillfinder.io/privacy`,
   screenshots, and the review notes.

App Privacy answers (they match the privacy manifest). No data is used for tracking.

| Data type | Linked to the user | Purpose |
| --- | --- | --- |
| Name | Yes | App functionality |
| Email address | Yes | App functionality |
| User ID | Yes | App functionality |
| Photos (profile photo) | Yes | App functionality |
| Precise location | Yes (saved routes) | App functionality |
| Other user content (saved routes) | Yes | App functionality |
| Product interaction (Vercel Analytics) | No | Analytics |

Review notes draft:

> Hillfinder plans downhill-friendly routes for cyclists and skaters and gives spoken
> turn-by-turn directions. Demo account: <email> / <password>.
>
> Background location and audio: after the rider taps Start on a route, the app keeps
> receiving location and speaking directions while the phone is locked, so riders don't
> have to hold or look at the phone. Background location stops when the ride ends.
>
> To try it: sign in, tap the speaker button or turn on Voice Guidance in Settings,
> build a route, tap Start, and lock the phone.

Minimum functionality (guideline 4.2): locked-screen spoken guidance is native behavior a
website can't offer. Show it in the screenshots too.

Releasing a build:

1. `npm run ios:sync` with no `CAP_SERVER_URL`, so the app loads hillfinder.io.
2. In Xcode, raise the build number (and the version for a new release), choose
   Any iOS Device, then Product → Archive.
3. Distribute the archive to App Store Connect and add it to TestFlight.

### 5. TestFlight and a locked-screen ride

Upload a build to TestFlight and repeat the spike's test plan with a real ride: locked
phone, about 20 minutes, a call and other audio along the way. Pass criteria are the same
as the spike's: no GPS gap over 30 seconds, and every step instruction spoken while
locked.

## Open questions

- Should the app keep the screen on while navigating, as most navigation apps do, or rely
  on locked-screen guidance?
- App Store name and subtitle.
