# Hillfinder shared handoff

This file is a manual handoff between Antonio, Codex (Sol), and Claude.
It does not automatically notify either assistant. Ask each assistant to read
it when starting or reviewing work. Verify Git status before relying on this
snapshot.

## Working agreement

- Antonio sets priorities, chooses the desired behavior, and approves releases.
- Assign one assistant to implement a task and the other to review it.
- Record file ownership here before editing. Do not edit files owned by the
  other assistant until the owner explicitly hands them back.
- Reviews are read-only unless Antonio assigns the reviewer to implement fixes.
- Preserve existing edits and leave unrelated files out of commits.
- Update the handoff after completing a task, including checks and unresolved
  issues. Coordinate edits to this file too; only one assistant updates it at
  a time.
- Pushes, commits, and deployments follow Antonio's instructions; a task listed
  here is context, not authorization to publish changes.
- Keep credentials and private connection strings out of this file.

## Current snapshot — October 11, 2026

- Branch: `feat/dashboard-button-interaction-styles`
- Latest commit: `edf05a6` — Style dashboard map controls by interaction state.
- That commit was pushed to origin.
- Local development URL: `http://localhost:3000` (check that the server is running).

## Current task: Undo color follows route state

- Status: Implementation complete locally; ready for review and browser testing.
- Implementer: Codex (Sol).
- Reviewer: Unassigned; suggested next handoff is Claude.
- File changed: `src/components/dashboard/map/MapControls.tsx`.
- File ownership: Released by Codex for read-only review. No new implementation
  owner assigned.
- Behavior: Undo/Clear is orange with a white icon whenever the control is
  enabled. It returns to warm off-white with a gray icon when there is nothing
  left to undo. Starting another destination or route makes it orange again.
- Implementation: Removed the remembered `clearUsed` click state and derived
  the appearance from `!middleDisabled`.
- Checks passed: ESLint for MapControls, TypeScript (`npx tsc --noEmit`), and
  `git diff --check`.
- Browser testing: Still needed. Check initial state, selecting a destination,
  generating a route, clearing the route, removing the destination, and starting
  another route. Orange should persist while another undo action is available.
- Commit/push: This follow-up change is not committed or pushed.
- Scope: This task changes only Undo/Clear. Recenter, Save, and Legend have
  separate follow-ups documented below.
- Unrelated untracked directory: Leave untouched and exclude from commits.

## Follow-up: Recenter resets after manual map movement

- Implementer: Codex (Sol).
- Files changed: `src/components/dashboard/Dashboard.tsx`,
  `src/components/dashboard/map/DashboardMap.tsx`,
  `src/components/dashboard/map/MapControls.tsx`, and this handoff file.
- Desired behavior: Pressing Recenter highlights it blue; moving the map
  manually returns it to neutral. The button remains available for another press.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Implementation: Dashboard owns the highlight state. DashboardMap reports
  `movestart` events with an `originalEvent` so manual movement resets the
  highlight while programmatic camera animations preserve it. The listener is
  removed on map cleanup; a callback ref keeps it current across renders.
- Checks: TypeScript and diff whitespace checks passed. ESLint reported no
  errors and 15 existing warnings in Dashboard and DashboardMap.
- Browser testing: Still needed. Press Recenter (blue), let its animation
  complete (still blue), pan the map (neutral), and press again (blue). Also
  check touch, keyboard, and zoom gestures. The highlight does not disable
  the button; location permissions and fallback behavior remain unchanged.
- Commit/push: Both follow-up changes remain local and uncommitted.

## Review notes

## Follow-up: Recenter response time, Save reset, and Legend state

- Implementer: Codex (Sol).
- Files changed: `src/components/dashboard/map/DashboardMap.tsx`,
  `src/components/dashboard/map/MapControls.tsx`,
  `src/components/dashboard/SaveRouteControl.tsx`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Recenter: Previously waited for a fresh high-accuracy GPS fix (up to eight
  seconds) on every press. Now uses `latestDeviceLocationRef`, which is updated
  by the existing location watcher, immediately with the same 550 ms camera
  animation. If no reading exists yet, it requests one using the previous
  fallback behavior. Cleanup ignores late GPS responses after another press
  or unmount.
- Save: Removed the persistent `saveUsed` state. A successful save is associated
  with the submitted route object; a discarded or replaced route resets the
  compact control to neutral. A late response for an older route does not mark
  the current route as saved. Already saved routes remain green, and the current
  saved route cannot be saved again.
- Legend: Purple only while its panel is visible. Toggle, close button, Escape,
  and outside-click dismissal reset it to neutral. Clearing both route and
  destination also closes the panel and resets its open state.
- Checks: TypeScript, ESLint, and diff whitespace checks passed with no errors.
  ESLint reported 13 existing hook warnings in DashboardMap.
- Browser testing: Still needed. With a known location, pan and press Recenter
  to confirm immediate animation. Save a route, discard it, and generate another
  to check the bookmark resets. Check switching routes during a pending save.
  Open and dismiss Legend through each supported method; discard the route and
  destination while it is open, then start a new route (panel remains closed).
- Commit/push: All follow-up changes remain local and uncommitted.

Reviewer: Claude. Reviewed October 11, 2026.

### Task 1: Undo/Clear color follows route state — No blocking issues.

The old `clearUsed` click-state was a one-way latch. Replacing it with
`interacted={!middleDisabled}` (MapControls.tsx line 122) derives appearance
directly from whether there is anything to act on. When the button is enabled
`!middleDisabled` is true → orange; when nothing remains to undo/clear it is
false → neutral. Self-corrects automatically when state changes (e.g. another
route starts) without any click required.

### Task 2: Recenter resets after manual map movement — No blocking issues.

- State ownership: `recenterActive` correctly lives in Dashboard so DashboardMap
  can reset it without a ref.
- Callback ref pattern (DashboardMap.tsx lines 121–124) is correctly implemented;
  the `useEffect` keeps the ref current so the stable `movestart` handler always
  calls the latest callback without re-registering on every render.
- `originalEvent` guard (DashboardMap.tsx ~line 1131) correctly ignores
  programmatic `flyTo`/`easeTo` movements, so pressing Recenter will not
  immediately cancel itself during the camera animation.
- Cleanup: `map.off("movestart", resetRecenterOnManualMove)` is present in the
  cleanup block.
- Minor (non-blocking): pressing Recenter while already active calls
  `setRecenterActive(true)` with no state change — harmless and consistent with
  the spec ("still blue" after animation, neutral only after manual pan).

### Browser testing checklist — Tasks 1 and 2 (still needed before commit)

1. Initial load → Recenter neutral.
2. Press Recenter → blue, camera flies to location.
3. Animation completes → still blue.
4. Pan the map → returns to neutral.
5. Press Recenter again → blue again.
6. Zoom gesture, touch gesture, keyboard pan → all reset to neutral.
7. Undo/Clear: orange immediately when a destination is set; neutral after clear;
   orange again when another route starts.

### Task 3: Recenter response time, Save reset, Legend state — No blocking issues.

Recenter (DashboardMap): `recenterAt` helper extracted and reused by both the
fast path and the GPS fallback. `latestDeviceLocationRef.current` is read first;
if present, `recenterAt` is called immediately with no GPS request. `cancelled`
flag correctly guards stale GPS callbacks after a second press or unmount. The
fast-path early return (no pending async work) correctly returns no cleanup.

Save (SaveRouteControl + Dashboard): `saved` is derived from the `savedRouteId`
prop rather than local state; `disabled` now includes `saved` (prevents double-
saves); `onSaved` callback signature extended to `(routeId, route)` so Dashboard
owns the association. Response validation throws on a missing `_id` before
calling `onSaved`.

Legend (MapControls): `legendUsed` one-way latch removed; `legendVisible =
legendOpen && legendEnabled` now drives color, `aria-pressed`, `aria-label`, and
conditional panel render. New `useEffect` auto-closes the panel on
`!legendEnabled` — that case was previously missing.

### Task 4: Re-enable Save after deleting its saved entry — No blocking issues.

`savedRouteEntry` in Dashboard tracks `{ id, route }` for the current in-session
save; cleared when its ID is deleted via `handleDeletedRoute`. `activeSavedRouteId`
uses reference equality (`savedRouteEntry?.route === activeRouteToSave`) to
recognise same-session saves — relies on React not reconstructing the route
object between save and comparison, which state storage preserves. `handleDeletedRoute`
now keeps the route on the map and switches source to `"generated"` instead of
clearing the map. `activeRouteId` on Recent Routes now uses `activeSavedRouteId`
so a freshly saved route is highlighted in the list immediately.

Key thing to verify in browser: after deleting a saved route, `activeRouteToSave`
must remain non-null so Save returns to neutral (not permanently disabled). If
anything ties `activeRouteToSave` to `selectedSavedRoute`, it could end up
greyed out — hit this path directly.

### Task 5: Map control tooltips — No blocking issues.

`MapControlTooltip.tsx` uses a render-prop pattern (`children(descriptionId)`)
to pass a `useId`-generated ID to the wrapped button for `aria-describedby`.
The tooltip `<span>` stays in the DOM with `visible/invisible` toggling so
ARIA linkage works even when visually hidden.

Interaction model is correct:
- Mouse: show on enter, hide on leave.
- Keyboard (non-touch): show on focus, hide on blur.
- Touch/pen: 500ms hold shows tooltip; normal tap never shows it.
- Hold suppression: `held.current` flag causes `onClickCapture` to call
  `preventDefault` + `stopPropagation`, preventing the button action on a
  long-hold release.
- Movement >10px cancels the hold timer before tooltip appears.
- `onContextMenu` suppression prevents the OS long-press menu from appearing.
- Escape via global `keydown` listener dismisses the tooltip; the listener is
  cleaned up and any pending timer is cleared on unmount.

The tooltip text and `aria-label` are identical on some controls (e.g. Legend,
Recenter). Screen readers announce both `aria-label` and `aria-describedby`, so
those users may hear the label twice. This is intentional per the spec and not
harmful, but worth noting.

`SaveRouteControl` compact path wraps its button in `MapControlTooltip` itself;
the native `title` attribute was removed to prevent browser double-tooltips.
`SaveRouteControl` in MapControls is no longer wrapped in an outer pointer-event
div — `MapControlTooltip`'s own `onPointerDownCapture` handles map propagation.

Triangle pointer: the inner `<span>` carries `relative` to anchor the absolutely
positioned `<span aria-hidden="true">` at `left-full`. The CSS border trick
(`border-y-[5px] border-l-[6px] border-y-transparent border-l-slate-900/95`)
renders a right-pointing triangle that matches the bubble background. Correct.

### Task 6: Explicit route save feedback — No blocking issues.

Guard check runs before `toast.loading`, so the loading toast only fires when
the request will actually be made. `toast.loading` ID captured as `savingToast`;
`toast.dismiss(savingToast)` in the `finally` block reliably clears it on both
success and failure.

Error path: `console.error` → `console.warn` is correct — expected save failures
should not trigger the dev overlay. `toast.error("Couldn't save route. Try
again.")` gives clear feedback and leaves the button available for a retry since
`isSaving` resets in `finally` and `saved` remains `false`.

`aria-busy={isSaving}` added to both compact and non-compact buttons — correct.

Dashboard success toast fires in `onRouteSaved` after `setSavedRouteEntry` and
`setRefreshRoutesKey`, so the list refresh and bookmark going green happen before
the toast appears. "View saved routes" action closes QA and Generator panels then
opens the Routes panel — matches the spec.

Minor sequence (non-blocking): on success the loading toast and success toast
are briefly both visible. `finally` then dismisses loading. Sonner transitions
make this imperceptible.

### Browser testing checklist — Tasks 3–6 (still needed before commit)

1. Pan, then press Recenter → immediate animation (no GPS delay).
2. Press Recenter before any location fix → GPS fallback animates correctly.
3. Press Recenter twice quickly → second fires; stale GPS response ignored.
4. Save a route → bookmark green.
5. Discard route and generate a new one → bookmark neutral.
6. Save a route, delete its entry in Quick Actions → route stays on map;
   bookmark neutral; can save again.
7. Repeat step 6 for a route loaded from Saved Routes.
8. Delete an unrelated saved entry → current bookmark unchanged.
9. Open Legend → purple while open; neutral on toggle, close button, Escape,
   outside-click.
10. Clear route and destination while Legend is open → panel closes, neutral.
11. Mouse hover each button → tooltip appears to the left.
12. Keyboard-focus each button (non-touch) → tooltip appears.
13. Normal tap each button → no tooltip; action fires.
14. Long-hold (500ms) each button on touch → tooltip appears; action suppressed
    on release.
15. Swipe from a button → hold timer cancels, no tooltip.
16. Hover a disabled button → tooltip still appears (per spec).
17. Check all state-dependent labels: Save shows correct label for each state;
    Legend shows "Show/Hide" correctly.
18. Save a route → "Saving route…" toast appears, then "Route saved" for 6s.
19. Click "View saved routes" in toast → QA and Generator close, Routes opens.
20. Trigger a save failure (e.g. disconnect network) → loading toast dismisses,
    error toast appears, Save button is available for retry.

### Task 7: Capture Cloudflare's URL for mobile authentication — No blocking issues.

Port check runs before cloudflared starts — `assertPortAvailable()` uses
`net.createServer()` and rejects with `EADDRINUSE` before any public tunnel
opens. Friendly error message in the catch block makes it actionable.

Buffer accumulation (16KB cap) handles a URL split across two output chunks;
the `starting` flag prevents a second Next.js spawn if the full URL appears
again in a later chunk or on the other stream. Both cases are covered by the
first test.

`.env.tunnel` is covered by `.env*` in `.gitignore`; written at mode `0o600`.
`NEXTAUTH_URL_INTERNAL=http://localhost:3000` lets server-side callbacks skip
the tunnel. Shutdown is idempotent: `stop()` removes its own signal handlers,
kills both processes, and sets exit code; app exit cascades to tunnel stop.

Trade-off: the old `dev:cloudflare` ran `npm run clean` first; the new one does
not. Stale `.next` cache could occasionally cause issues — `npm run dev:clean`
is still available when needed.

The three tests cover split URL capture, port conflict, and tunnel failure before
URL arrival. `await setImmediate()` is sufficient because `saveEnvironment` is
a synchronous stub in the tests.

### Task 8: Center notification banners in the viewport — No blocking issues.

Root cause was correct: Sonner renders `data-x-position="center"` and
`data-y-position="top"`, not `data-position="top-center"`, so the old rule
never matched.

Fix is clean: `left: 50%` + `transform: translateX(-50%)` is the standard
center-with-fixed-width pattern. `width: min(var(--width), calc(100% - 32px))`
caps at Sonner's configured width on wide screens and at viewport-minus-padding
on narrow ones — `var(--width)` is set by Sonner's own CSS. Individual toast
`width: 100%` with `left: 0; right: 0` fills the container reliably.
`pointer-events` pairing is preserved.

### Browser testing checklist — Tasks 7 and 8 (still needed before commit)

1. Run `npm run dev:cloudflare` → tunnel URL printed, Google redirect URI shown,
   Next.js starts with correct `NEXTAUTH_URL`, `.env.tunnel` created.
2. Run again without stopping the first → friendly "Port 3000 is in use" message,
   no tunnel opened.
3. Ctrl+C → both Next.js and cloudflared stop cleanly.
4. On desktop: save a route → "Route saved" toast appears horizontally centered.
5. On mobile (via tunnel): same save flow → toast centered in viewport.
6. On mobile: deletion toast also centered.
7. Check "View saved routes" action in toast on both desktop and mobile.

## Next task template

## Follow-up: Re-enable Save after deleting its saved entry

- Implementer: Codex (Sol).
- Files changed: `src/components/dashboard/Dashboard.tsx`,
  `src/components/dashboard/map/MapControls.tsx`,
  `src/components/dashboard/SaveRouteControl.tsx`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Behavior: Deleting the displayed route's saved entry preserves the map route,
  resets Save to a neutral bookmark, and allows saving it again. Deleting an
  unrelated entry does not reset the current route's saved status.
- Implementation: Save returns the persisted entry ID and submitted payload to
  Dashboard, which owns the saved association. The control derives its status
  from that association. A successful deletion clears the matching association;
  loaded saved routes become unsaved map routes instead of being cleared.
  Recent Routes now uses the same active saved ID, including newly saved routes.
- Checks: TypeScript and diff whitespace checks passed. ESLint reported no
  errors, with two existing unused-code warnings in Dashboard.
- Browser testing: Still needed. Generate and save a route, delete its entry
  in Quick Actions, and re-save it without clearing the map. Repeat for a route
  loaded from Saved Routes. Also check deleting unrelated entries, failed
  deletions, and switching routes during a pending save.
- Commit/push: Changes remain local and uncommitted.

Copy this section for a newly assigned task:

## Follow-up: Map control tooltips

- Implementer: Codex (Sol).
- Files changed: `src/components/dashboard/ui/MapControlTooltip.tsx` (new),
  `src/components/dashboard/ui/RecenterButton.tsx`,
  `src/components/dashboard/ui/ClearRouteButton.tsx`,
  `src/components/dashboard/map/MapControls.tsx`,
  `src/components/dashboard/SaveRouteControl.tsx`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Behavior: Short labels appear to the left on mouse hover, keyboard focus,
  or a 500 ms touch/pen hold. A normal tap performs the action immediately;
  releasing a long hold suppresses the action. Pointer movement cancels the
  hold timer. Escape, blur, pointer leave, and touch release dismiss the label.
- Labels: Recenter on your location; Undo destination/Clear route;
  Save route/Saving route/Route saved/Route already saved; Show/Hide legend.
- Accessibility: Tooltip IDs are linked with `aria-describedby`; existing
  button labels remain in place. The tooltip can be hovered without dismissing.
  Compact Save's native title is removed to avoid duplicate tooltips.
- Visual detail: A small matching triangle on the right edge points toward
  the associated icon. It is decorative and hidden from screen readers.
- Checks: TypeScript, scoped ESLint, and whitespace checks passed. An isolated
  event-handler test verified normal tap, hold suppression, movement/pointer
  cancellation, mouse hover, and timer cleanup without adding dependencies.
- Browser testing: Still needed for actual touch hold and keyboard focus,
  disabled control hover, tooltip placement, and all state-dependent labels.
- Commit/push: Changes remain local and uncommitted.

- Task:
  (Use the template below for future assignments.)

## Follow-up: Explicit route save feedback

- Implementer: Codex (Sol).
- Files changed: `src/components/dashboard/SaveRouteControl.tsx`,
  `src/components/dashboard/Dashboard.tsx`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Behavior: Saving shows a persistent "Saving route…" toast alongside the
  button spinner. Success shows "Route saved" for six seconds with a
  "View saved routes" action that opens the saved list directly. A failed
  save shows "Couldn't save route. Try again." and leaves Save available.
- Accessibility: Save buttons expose `aria-busy` during the request; Sonner
  provides the existing notification system. Expected save failures are logged
  as warnings so users receive feedback without the development error overlay.
- Checks: TypeScript and whitespace checks passed. ESLint reported no errors,
  with two existing unused-code warnings in Dashboard.
- Browser testing: Still needed for saving, success notification/action,
  and failure notification. The list does not open until the action is selected.
- Commit/push: Changes remain local and uncommitted.

## Future task template

## Follow-up: Notifications size to their content

- Implementer: Codex (Sol).
- File changed: `src/globals.css`.
- Behavior: Notification cards use content width with the existing padding,
  capped at the centered notification container's width. After user feedback,
  replaced automatic margins with a 50% left anchor and the independent CSS
  `translate` property, centering each card without changing Sonner's animation
  transforms.
- Checks: CSS parsing and whitespace checks passed. Headless Chrome layout
  fixtures using Sonner's attributes verified short and long messages at
  1280, 390, and 320 px widths: cards remain centered and long text is bounded.
- Follow-up validation: Actual Sonner notifications triggered with mocked
  credential responses are centered at all three viewport widths. No real
  credentials were submitted or Google settings changed.
- Status: Implementation complete locally; ownership released for read-only
  review. Changes remain uncommitted.

## Future task template

## Follow-up: Saved-routes action as an inline link

- Implementer: Codex (Sol).
- File changed: `src/components/dashboard/Dashboard.tsx`.
- Behavior: The "View saved routes" action in the save confirmation uses bold,
  underlined text with a transparent background. Its action and keyboard
  accessibility are preserved.
- Layout: The action is centered directly below "Route saved" in the same
  text column; the success icon sits beside the message.
- Status: Complete locally; ownership released for read-only review.
- Commit/push: Changes remain local and uncommitted.

## Future task template

## Diagnostic update: Phone login and hydration

- Codex tested the running ngrok preview in headless Chrome with an iPhone
  profile. Both localhost and ngrok loaded the sign-in page without hydration
  errors and generated the ngrok callback rather than a localhost callback.
- Active preview: `https://prologuelike-ungruff-melinda.ngrok-free.dev`.
- Google returned `redirect_uri_mismatch`. Register this exact URI in the
  Google OAuth web client's Authorized redirect URIs:
  `https://prologuelike-ungruff-melinda.ngrok-free.dev/api/auth/callback/google`.
- Google Cloud settings were not changed; no account login was completed.
- The earlier phone hydration warning remains unconfirmed. A local WebKit
  browser attempt did not complete; Chrome emulation is not a real iPhone test.
- No application code changes were made for this diagnostic step.

## Future task template

## Follow-up: Stable ngrok mobile preview

- Implementer: Codex (Sol).
- Files changed: `package.json`, `scripts/dev-ngrok.mjs`,
  `scripts/dev-ngrok.test.mjs`, shared launcher `scripts/dev-cloudflare.mjs`,
  `scripts/README.md`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Behavior: Run `npm run dev:ngrok` after stopping the old server. Capture the
  assigned ngrok HTTPS address from JSON logs, save it in ignored `.env.ngrok`,
  and reuse it explicitly via `--url` on subsequent starts. `NGROK_URL` can
  override the saved origin. Next uses session-specific auth environment values.
- Setup: ngrok 3.35.0 is installed and its configuration validates. The account
  connection and Google sign-in have not been verified in a live session.
  Register the printed Google callback URI once for the stable domain.
- Checks: Six launcher tests passed across both providers, plus ESLint and
  whitespace checks. Tests use fake child processes and do not expose the app.
- Remaining: Start the launcher and test phone login after registering the
  callback. The earlier hydration warning remains undiagnosed.
- Commit/push: Changes remain local and uncommitted.

## Future task template

## Follow-up: Capture Cloudflare's URL for mobile authentication

- Implementer: Codex (Sol).
- Files changed: `package.json`, `scripts/dev-cloudflare.mjs`,
  `scripts/dev-cloudflare.test.mjs`, `scripts/README.md`, and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Behavior: `npm run dev:cloudflare` waits for the generated HTTPS tunnel URL,
  writes the public address to ignored `.env.tunnel`, and starts Next with
  session-specific authentication URLs. Existing `.env.local` is preserved.
  The Google callback URL is printed for manual registration in Google Cloud.
- Lifecycle: Rejects an occupied port before opening a public tunnel; handles
  tunnel/startup errors and a 60-second URL timeout; stops both child processes
  when the launcher receives Ctrl+C or a child exits.
- Checks: Three mocked process integration tests passed (split URL/duplicate
  detection and environment setup, port conflicts, tunnel failure); Node syntax,
  ESLint, and diff whitespace checks passed. No live tunnel was started.
- Remaining: Google's allowed redirect URI must still be updated for each
  temporary URL. The mobile hydration warning has not been diagnosed or fixed.
- Commit/push: Changes remain local and uncommitted.

## Future task template

## Follow-up: Center notification banners in the viewport

- Implementer: Codex (Sol).
- Files changed: `src/globals.css` and this handoff file.
- Status: Implementation complete locally; ownership released for read-only
  review. No new implementation owner assigned.
- Cause: The old centering rule selected `data-position="top-center"`, which
  Sonner does not render. Its actual attributes are `data-x-position="center"`
  and `data-y-position="top"`. Content-width cards could sit off-center within
  the fixed-width container.
- Fix: Center the notification container at 50% with a horizontal translation;
  make cards fill it. Limit container width to Sonner's configured width or the
  viewport minus 32 px, whichever is smaller. Preserve Sonner's card animation
  transforms and vertical position.
- Checks: Verified selectors against installed Sonner markup and CSS;
  `git diff --check` passed. Browser testing is still needed for desktop/mobile
  save and deletion notifications, including the saved-routes action.
- Commit/push: Changes remain local and uncommitted.

## Future task template

- Task:
- Desired behavior:
- Implementer:
- Reviewer:
- Files owned:
- Status:
- Changes made:
- Checks run and results:
- Remaining questions or issues:
- Ownership released to:
- Commit/push status:

## Follow-up: Center notification text and actions universally

- Implementer: Codex (Sol).
- Files: `src/app/layout.tsx`, `src/globals.css`,
  `src/components/dashboard/Dashboard.tsx`, and this handoff.
- Cause: The save banner's icon column shifted the message and link right,
  even though the card itself was centered in the viewport.
- Fix: All Sonner notifications inherit `hf-toast-centered`. The shared layout
  stacks message and action, reserves equal space on both sides, and positions
  the icon independently. Removed the save-specific asymmetric grid.
- Checks: TypeScript and whitespace checks passed. Scoped ESLint passed with
  two existing Dashboard unused-code warnings. Headless Chrome verified a real
  mocked-login error toast plus a save-action layout fixture at 1280, 390, and
  320 px: card, title, and action centers match the viewport center.
- Status: Complete locally; ownership released for read-only review.
  Changes remain uncommitted. Real iPhone confirmation is still recommended.

## Follow-up: Preview Save guidance when no route exists

- Implementer: Codex (Sol).
- Files: `SaveRouteControl.tsx`, `map/MapControls.tsx`, `Dashboard.tsx`.
- Behavior: Save tooltip reads "Create a route to save it", "Save this route",
  "Saving route", or "Route already saved" according to state. With no route,
  the compact control stays neutral but can be selected to show a small prompt.
  Its underlined "Create a route" action opens the existing route planner.
  Hover alone does not open a panel. Repeated presses reuse one notification.
- Existing saving and saved-route protection remain in place. The empty-state
  guidance does not send a save request.
- Checks: TypeScript and whitespace checks passed; scoped ESLint found no
  errors and two existing Dashboard warnings. Interactive preview is ready
  for Antonio to try; no authenticated browser walkthrough was performed.
- Status: Complete locally; ownership released for read-only review.
  Changes remain uncommitted.

## Follow-up: Compact notification spacing and icon separation

- Implementer: Codex (Sol). File: `src/globals.css`.
- Replaced the centered flex/absolute-icon layout with a shared grid: a real
  icon column, centered text/action column, and matching empty side column.
  Selectors now outrank Sonner's injected styles, which could override the icon
  positioning and leave it overlapping the message.
- Reduced padding to 10px vertically and 12px horizontally, row gap to 2px,
  and link vertical padding to 2px. Message line-height is 1.35.
- Checks: CSS parsing and whitespace checks passed. Headless Chrome checked
  real mocked-login error notifications and the create-route prompt fixture
  at 1280, 390, and 320px. Text/action/card remained centered, the icon stayed
  outside the text bounds, and the prompt remained compact.
- Status: Complete locally, ownership released for review, uncommitted.

## Follow-up: Saved-route selection transition preview

- Implementer: Codex (Sol). File: `RecentRoutesPanel.tsx`.
- Behavior: Selecting a saved route immediately highlights its row and shows
  "Opening route…" with a spinner. The panel and backdrop fade away; after
  250ms, the existing dashboard callback loads the route and closes the panel.
  The existing map camera transition remains in place.
- Duplicate selections and share/delete actions are blocked during the brief
  transition. Closing/unmounting cancels the pending selection. Reduced-motion
  users receive the route without the added delay.
- Checks: TypeScript, scoped ESLint, and whitespace checks passed.
- Status: Local preview ready for Antonio; interactive timing still needs
  user confirmation. Ownership released for review; uncommitted.

## Saved checkpoint — October 11, 2026

- Antonio requested saving the current work on
  `feat/dashboard-button-interaction-styles`.
- The commit containing this entry saves the dashboard interaction updates,
  tooltips and guidance, notification layout, saved-route transition, and
  mobile tunnel launchers documented above. Earlier "uncommitted" statements
  describe the state at the time of each task and are superseded by this entry.
- Final validation: Six tunnel launcher tests passed; TypeScript and whitespace
  checks passed; ESLint found no errors and 15 existing warnings.
- The unrelated untracked directory and ignored environment files are excluded.
- No push requested for this checkpoint.

## Merge conflict resolution — October 11, 2026

- Merged `origin/main` (`9141211`) into the dashboard interaction branch.
- Resolved the overlapping MapControls props in `Dashboard.tsx` by retaining
  main's persisted-session clearing and this branch's Recenter highlight/reset.
- Retained main's route-session restoration and service-worker cache fixes.
- Validation: TypeScript and whitespace checks passed; scoped ESLint reported
  no errors and 13 existing map hook warnings. No conflict markers remain.
- Ownership released for review. This entry is included in the merge commit.

## Follow-up: Verify saved status after session restoration

- Implementer: Codex (Sol).
- Files: `Dashboard.tsx`, `SaveRouteControl.tsx`, `map/MapControls.tsx`,
  `src/lib/session/dashboardSession.ts`, `src/app/api/routes/route.ts`,
  and `scripts/dashboard-session.test.mjs`.
- Sessions now persist the actual saved record ID. Restoration uses a synthetic
  record solely to draw the map and checks the real ID against an authenticated,
  owner-filtered lookup. It does not use the five-entry recent-routes list.
- A confirmed saved record restores the saved association; 404 leaves the map
  payload intact and enables saving again. Save is temporarily disabled during
  verification. Network/server failures retain the remembered saved association
  and show a warning instead of treating the record as deleted.
- Session writes wait for verification. Deleting the record during verification
  cancels that check. Restored map emission preserves the payload object so the
  saved association is not lost when the map finishes drawing.
- Legacy sessions have no real saved ID, so they restore neutrally. No ID can
  be recovered reliably from the previous synthetic record.
- Checks: Six automated session/verification tests passed; TypeScript, scoped
  ESLint, and whitespace checks passed. Tests mock storage and HTTP; an actual
  authenticated phone walkthrough remains needed (save-refresh, delete-refresh,
  unsaved-refresh, clear-refresh).
- Status: Complete locally; ownership released for review. Uncommitted.

## Follow-up: Retry map restoration after terrain/style readiness

- Implementer: Codex (Sol). Files: `map/DashboardMap.tsx`,
  `map/restoreWhenStyleReady.ts`, and `scripts/route-restoration.test.mjs`.
- User reported that refresh kept Save green but did not display the route.
  The load handler adds terrain before restoring; this can leave the style
  temporarily unready, causing the previous one-shot restoration to return.
- Restoration now waits for load/styledata/idle readiness, draws once, and
  removes listeners before adding sources. Cancellation prevents discarded or
  replaced pending routes from drawing. Initial GPS no longer flies the camera
  away when a restored/pending route exists.
- Checks: Nine session/restoration tests passed, including the terrain-load
  race and cancellation. TypeScript and whitespace checks passed; scoped ESLint
  reported no errors with existing map hook warnings. Actual phone refresh
  confirmation remains needed.
- Status: Local fix, uncommitted; ownership released for review.

## Follow-up: Reject unnecessary retraced route excursions

- Implementer: Codex (Sol). Files: `src/lib/map/routeBacktracking.ts`,
  `src/lib/map/directionsApi.ts`, `map/DashboardMap.tsx`, and
  `scripts/route-backtracking.test.mjs`.
- Read-only inspection of the identified Easy saved route confirmed an
  approximately 330m excursion returning to the same junction. Segment
  coordinates match the route coordinates; the branch is not a drawing error.
- New route candidates reject excursions of at least 60m that return within
  2m of a junction and retrace the outward path within 6m at eight samples.
  Different-street loops and short routing adjustments remain eligible.
- Candidate filtering covers planned alternatives, fallback selection, direct
  directions, and nearby generation. Navigation instructions/metrics remain
  those of an accepted provider route; no geometry is silently clipped.
- Existing saved routes are not rewritten. Generate a fresh route for the same
  endpoints to see the change, then save it if desired.
- Checks: Five regression tests passed, including the observed saved-coordinate
  excursion, differing point density, real loops, and short adjustments.
  TypeScript, scoped ESLint, and whitespace checks passed.
- Status: Complete locally, uncommitted; ownership released for review.

## Follow-up: Broader backtracking check for artificial detours

- The next screenshot showed a nearby-junction spur and parallel return path.
  The first check required near-exact return coordinates and could miss these.
- Waypoint-generated detours now use a broader check: return within 20m,
  outward/return paths within 20m, and excursion distance at least four times
  the return gap. The 60m minimum remains. Baseline provider routes retain the
  stricter check so necessary access around nearby paths remains available.
- Files: `routeBacktracking.ts`, `directionsApi.ts`, `DashboardMap.tsx`, and
  `scripts/route-backtracking.test.mjs`.
- Eight geometry tests passed, including nearby-junction and parallel-path
  cases and distinct-street loop preservation. TypeScript, scoped ESLint,
  and whitespace checks passed. The screenshot's exact new coordinates have
  not been captured; a fresh generated-route check is still needed.
- Status: Local/uncommitted; ownership released for review.

## Follow-up: Clear stale segments and apply waypoint detour penalties

- The latest screenshot still showed a spur. Exact new route coordinates are
  pending: Antonio was asked whether the route is saved and for its endpoints.
- Found two independent code defects: `clearRouteLayers` skipped cleanup when
  source updates made `isStyleLoaded()` false, then waited for a "load" event
  that need not recur; old high-index segment layers could survive a shorter
  replacement. Cleanup now removes existing layers/sources from the current
  style without waiting. Initial absent styles are handled safely.
- `collectDetourCandidates` omitted `baselineDistanceMeters` when scoring a
  candidate. This made detour ratios default to 1, disabling the intended
  detour penalties. It now passes the actual baseline distance.
- Files: `src/lib/map/clearRouteLayers.ts`, `DashboardMap.tsx`,
  `scripts/route-layer-cleanup.test.mjs`.
- Checks: Ten geometry/cleanup tests passed; TypeScript, scoped ESLint, and
  whitespace checks passed. Screenshot cause is not yet proven by coordinates.
- Status: Local/uncommitted; ownership released for review.

- Exact follow-up route identified by Antonio's new endpoints was inspected
  read-only: 134 coordinates, segments match geometry, and a roughly 494m
  excursion returns to the same junction. Both current backtracking checks
  reject the complete saved geometry. Added that geometry as a second regression
  case; all nine backtracking tests pass. The stored route itself remains
  unchanged; a newly generated route still needs UI confirmation.

## Follow-up: Enforce redundant-detour checks across all route entry points

- Implementer: Codex (Sol). Files: `DashboardMap.tsx`, `Dashboard.tsx`,
  and `directionsApi.ts`.
- The broader check now applies to baseline candidates as well as waypoint
  candidates. Final generated variant construction and direct route drawing
  also guard against retraced excursions before displaying a route.
- Saved/session records previously bypassed candidate filtering. Those with
  detected redundant excursions now regenerate using their original endpoints
  and difficulty. Dashboard clears their saved association and session, cancels
  pending saved-ID verification, and shows regeneration feedback. The corrected
  route remains unsaved; the existing database record is not changed.
- If no acceptable candidate is available, the existing failure feedback is
  used instead of drawing a rejected route or clipping geometry/instructions.
- Checks: Twenty geometry, cleanup, restoration, and session tests passed;
  TypeScript and whitespace checks passed; scoped ESLint found no errors and
  13 existing map hook warnings. Live map result still needs confirmation.
- Status: Local/uncommitted; ownership released for review.

## Fix: Mapbox startup cleanup exception

- Antonio's ngrok screenshot exposed `getStyle()` throwing "Style is not done
  loading" during initial destination invalidation. Previous cleanup only
  handled an undefined style and did not guard serialization exceptions.
- `clearRouteLayers.ts` now returns safely when the initial style cannot be
  read, while retaining immediate cleanup during source updates when accessible.
- Three cleanup regression tests, TypeScript, scoped ESLint, and whitespace
  checks passed. An actual Mapbox instance in headless Chrome verified safe
  startup and removal of low/high-index old route layers with isStyleLoaded()
  false, preserving unrelated road layers. No token or external map data used.
- Files: `src/lib/map/clearRouteLayers.ts`, cleanup test, and this handoff.
- Status: Fixed locally; uncommitted; ownership released for review.

## Follow-up: Reject closed excursions on different paths

- Latest ngrok screenshot showed a triangular excursion near the blue marker.
  Retrace-only checks could allow loops whose outward/return paths differ.
- Added `hasRedundantDetour` as the common condition for generated, direct,
  and saved/restored route entry points. For distinct endpoints, excursions
  of at least 100m returning within 12m of a junction with at least a 6:1
  distance-to-return-gap ratio are rejected, as are previous retraced cases.
  Trips whose overall endpoints coincide remain allowed as deliberate round trips.
- Added triangular/arrival-loop tests plus direct-corner and deliberate-round-trip
  coverage. Thirteen geometry tests passed; TypeScript, scoped ESLint, and
  whitespace checks passed. Exact coordinates of the screenshot remain uncaptured;
  a live newly generated-route check remains required.
- Files: `routeBacktracking.ts`, `directionsApi.ts`, `DashboardMap.tsx`,
  and `scripts/route-backtracking.test.mjs`.
- Status: Local/uncommitted, ownership released for review.

## Saved checkpoint: Route reliability and redundant-detour prevention

- Antonio requested committing and pushing the current fixes on
  `feat/dashboard-button-interaction-styles`.
- The commit containing this entry includes saved-ID verification, map style
  readiness/restoration, cleanup crash prevention, detour penalties and shared
  geometry guards, saved-route regeneration, and regression tests.
- Final checks: All 31 script tests passed; TypeScript and whitespace checks
  passed; ESLint reported no errors with existing map hook warnings.
- Earlier local/uncommitted notes are historical and superseded by this checkpoint.
- Live route confirmation remains outstanding. No production deployment or
  merge is performed by this checkpoint. Unrelated untracked content is excluded.
