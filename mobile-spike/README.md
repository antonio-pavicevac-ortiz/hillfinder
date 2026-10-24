# Locked-screen spike

A throwaway Capacitor app that answers one question before Hillfinder commits to Capacitor:
do GPS updates and spoken prompts keep coming while the phone is locked?

It is not the Hillfinder app. It shares no code with it and is not built or linted by the
root project.

## What it does

- Starts a background location watcher (`@capacitor-community/background-geolocation`).
  On Android this runs a foreground service with an ongoing notification.
- Speaks a short status sentence from the GPS callback at most every 30 seconds, using
  native speech (`@capacitor-community/text-to-speech`, iOS audio category `playback`).
  Speech is driven by location updates, the same way turn-by-turn guidance would be.
- Separately records a JS timer tick every 10 seconds. Timers are expected to stop in
  the background; that shows whether guidance logic must be driven by GPS callbacks.
- Logs every event with a timestamp and whether the app was active or backgrounded, keeps
  the log across restarts, and exports it as CSV with **Share log**.

## Run it

```sh
cd mobile-spike
npm install
npm run sync          # builds the web page and copies it into both native projects
npx cap open ios      # or: npx cap open android
```

**iPhone (Xcode):** select the App target → Signing & Capabilities → choose your team
(a free Apple ID works; the install expires after 7 days). Plug in the phone, enable
Developer Mode on it when prompted, and press Run.

**Android (Android Studio):** finish the SDK setup wizard on first launch, enable USB
debugging on the phone, and press Run.

When asked for location, choose **Allow While Using App** first. iOS later offers
**Change to Always Allow**; accept it. On Android, allow notifications.

## Test plan

Repeat on one iPhone and one Android phone:

1. Clear log, tap **Start**, wait for "Tracking started".
2. Lock the phone and put it in a pocket. Walk about 20 minutes outdoors.
3. Along the way: take or simulate a phone call, play and stop other audio, and stand
   still for 2 minutes.
4. Unlock, tap **Stop**, then **Share log** and send the CSV back for review.

## Pass criteria

- GPS updates continue while `[background]`, with no gap over 30 seconds while walking.
- A spoken prompt is heard roughly every 30 seconds for the whole walk, including after
  the call and other audio.
- Tracking resumes on its own after standing still.

If either platform goes silent or stops updating while locked, the decision tips toward
React Native/Expo (see APP_STORE_READINESS.md).

## Results

**iPhone, 2026-10-24: pass.** A 29-minute walk with the phone locked from start to finish.

- GPS: 1,686 updates while locked, about one per second. Longest gap 17 s; no other gap
  over 10 s.
- Speech: 56 prompts while locked, about every 30 seconds from the first minute to the
  last. Longest gap 44 s.
- No errors. The geolocation plugin built and ran on Capacitor 8 without changes.
- The JS timer kept ticking while locked, unlike the expectation above. The open audio
  session is the likely reason. Guidance should still be driven by GPS callbacks rather
  than relying on that.
- The log does not show whether the call, other-audio and standing-still steps were done.
  No gaps appear at any point, so none of them interrupted tracking or speech.

**Android: not tested.** There was no Android phone available. Hillfinder is going iOS-only
for now. Before any Android release, repeat the test plan on a real phone, ideally a
Samsung, since its battery saving is among the most aggressive.

## Known limits

- The geolocation plugin documents support through Capacitor 7; this spike uses
  Capacitor 8, so a native build failure there is itself a finding.
- Force-quitting the app ends tracking by design; that is different from locking.
- The app ID `com.hillfinder.spike` is a placeholder, not the store identifier.
