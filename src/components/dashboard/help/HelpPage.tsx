"use client";

import {
  Bookmark,
  CornerDownLeft,
  Lock,
  MapPin,
  MousePointerClick,
  Palette,
  RotateCcw,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { useIsNativeApp } from "@/lib/native/useIsNativeApp";
import Link from "next/link";
import type { ReactNode } from "react";

// Each topic's icon takes the color of the control it describes on the map
type Topic = {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  body: ReactNode;
};

const TOPICS: Topic[] = [
  {
    title: "Get a route",
    icon: MousePointerClick,
    iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
    body: (
      <>
        <p>
          Tap the map where you want to go. A message shows the place with a <b>Get route</b> button;
          tap it and Hillfinder finds the way there.
        </p>
        <p>
          To type places instead, or to choose an <b>Easy</b> or <b>Hard</b> route, open{" "}
          <b>↑ Quick Actions</b> and tap <b>Plan Your Route</b>.
        </p>
      </>
    ),
  },
  {
    title: "Start somewhere else",
    icon: MapPin,
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    body: (
      <>
        <p>
          Routes start where you are, at the green dot. To plan one that starts somewhere else,{" "}
          <b>press and hold</b> that spot on the map and choose <b>Start here</b>. <b>Go here</b>{" "}
          sets the destination the same way.
        </p>
        <p>
          You can also type a start in Plan Your Route: tap <b>Change</b> next to From. The start and
          destination can be up to 30 km (about 18 miles) apart.
        </p>
      </>
    ),
  },
  {
    title: "Find a Downhill",
    icon: TrendingDown,
    iconClassName: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400",
    body: (
      <p>
        Not sure where to go? Open <b>↑ Quick Actions</b> and tap <b>Find a Downhill</b>. Hillfinder
        looks about a kilometer around you in every direction and picks the ride that goes downhill
        the most. Tap it again for a different one.
      </p>
    ),
  },
  {
    title: "Ride with your phone locked",
    icon: Lock,
    iconClassName: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    body: (
      <>
        <p>
          Tap <b>Start</b> to begin. Turn on <b>Voice Guidance</b> in Settings and Hillfinder speaks
          each turn, so you can lock your phone and keep it in your pocket. The speaker button on the
          directions card mutes it.
        </p>
        <p>
          In the iPhone app, your next turn and how far away it is also show on the lock screen and
          in the Dynamic Island.
        </p>
      </>
    ),
  },
  {
    title: "Getting to the start, and off route",
    icon: CornerDownLeft,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    body: (
      <>
        <p>
          If you tap Start away from where the route begins, Hillfinder guides you to its start
          first, then along the route.
        </p>
        <p>
          If you leave the route, Hillfinder tells you. Tap <b>Show the way back</b> to see how to
          return, or <b>New route from here</b> to start fresh from where you are.
        </p>
      </>
    ),
  },
  {
    title: "Route colors, Easy and Hard",
    icon: Palette,
    iconClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
    body: (
      <>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <ColorKey color="#22c55e" label="Easy downhill" />
          <ColorKey color="#eab308" label="Medium downhill" />
          <ColorKey color="#ef4444" label="Hard downhill" />
          <ColorKey color="#7f1d1d" label="Uphill" />
        </ul>
        <p>
          An <b>Easy</b> route keeps climbing to a minimum. A <b>Hard</b> route takes on more hills
          for a bigger ride.
        </p>
      </>
    ),
  },
  {
    title: "Clear route and Start over",
    icon: RotateCcw,
    iconClassName: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    body: (
      <p>
        The round button below Recenter, on the right of the map, steps back one stage at a time.
        With a route showing it clears the route and keeps your start and destination. Tap it again
        to <b>Start over</b>: the destination goes, and the start returns to where you are.
      </p>
    ),
  },
  {
    title: "Save a route",
    icon: Bookmark,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    body: (
      <p>
        Like a route? Tap the <b>bookmark</b> button on the right of the map to save it. Find it
        again under <b>↑ Quick Actions</b> → <b>Saved Routes</b>.
      </p>
    ),
  },
];

const APP_STORE_URL = "https://apps.apple.com/app/id6827215955";

// Signed-in riders come here from the map; visitors may arrive from a link and haven't signed up
export default function HelpPage({ signedIn }: { signedIn: boolean }) {
  const isNativeApp = useIsNativeApp();

  return (
    <main className="min-h-screen bg-[#f6f7f2] dark:bg-slate-900 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] transition-colors">
      <div className="mx-auto max-w-xl mt-6">
        <Link
          href={signedIn ? "/dashboard" : "/"}
          className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          {signedIn ? "← Back to map" : "← Back to Hillfinder"}
        </Link>

        <h1 className="mt-5 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          How to use Hillfinder
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Find a route, ride it hands-free, and come back to the ones you like.
        </p>

        <div className="mt-6 space-y-4">
          {TOPICS.map(({ title, icon: Icon, iconClassName, body }) => (
            <section
              key={title}
              className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 p-4 shadow-sm transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
                >
                  <Icon size={18} />
                </span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300 [&_b]:font-semibold [&_b]:text-gray-900 dark:[&_b]:text-slate-100">
                {body}
              </div>
            </section>
          ))}
        </div>

        {!signedIn && (
          <section className="mt-8 rounded-2xl bg-emerald-600 p-6 text-center text-white shadow-sm dark:bg-emerald-700">
            <h2 className="text-lg font-semibold">Ready to find your hill?</h2>
            <p className="mt-1 text-sm text-emerald-50">Hillfinder is free.</p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 sm:w-auto"
              >
                Get started
              </Link>
              {/* The app can't send people to install itself */}
              {!isNativeApp && (
                <a
                  href={APP_STORE_URL}
                  className="w-full rounded-xl border border-white/70 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Get the iPhone app
                </a>
              )}
            </div>
            <p className="mt-4 text-sm text-emerald-50">
              Already have an account?{" "}
              <Link href="/auth/signin" className="font-semibold underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function ColorKey({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="h-1.5 w-6 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </li>
  );
}
