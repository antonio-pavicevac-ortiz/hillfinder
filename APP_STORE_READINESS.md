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
work as they are. Riders who signed up with Google can set a password through
Forgot password.

Later, if Google sign-in is wanted in the app, it needs a system-browser sign-in flow that
hands the session back to the app, plus Sign in with Apple.

### 4. App Store requirements

- Apple Developer Program membership ($99/year). The free account's installs expire after
  7 days and can't use TestFlight or the App Store.
- Account deletion in the app (guideline 5.1.1(v)). Settings already has Delete account.
- Privacy policy URL: `https://hillfinder.io/privacy`. Check that it covers background
  location.
- App Privacy answers in App Store Connect: precise location, email, name, photos
  (profile images via UploadThing), and Vercel Analytics.
- `PrivacyInfo.xcprivacy` privacy manifest for the APIs the app and plugins use.
- Review notes: a demo account, and an explanation of why the app uses location in the
  background (turn-by-turn guidance while the phone is locked).
- Minimum functionality (guideline 4.2): locked-screen guidance is native behavior a
  website can't offer. Make it obvious in the screenshots and review notes.

### 5. TestFlight and a locked-screen ride

Upload a build to TestFlight and repeat the spike's test plan with a real ride: locked
phone, about 20 minutes, a call and other audio along the way. Pass criteria are the same
as the spike's: no GPS gap over 30 seconds, and every step instruction spoken while
locked.

## Open questions

- Should the app keep the screen on while navigating, as most navigation apps do, or rely
  on locked-screen guidance?
- App Store name and subtitle.
