import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Privacy Policy — Hillfinder",
  description:
    "What Hillfinder collects, why, who it's shared with, and how to delete it.",
};

const EFFECTIVE_DATE = "October 24, 2026";

// SUPPORT_EMAIL wins; otherwise use the address our reset emails are sent from.
function contactEmail() {
  const raw = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "";
  return raw.match(/<([^>]+)>/)?.[1] ?? raw.trim();
}

export default function PrivacyPolicyPage() {
  const email = contactEmail();

  return (
    <div className="min-h-screen bg-[#f6f7f2] dark:bg-slate-900 transition-colors">
      <article className="mx-auto max-w-2xl px-5 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-10 text-slate-700 dark:text-slate-300">
        <Link
          href="/"
          className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          ← Back to Hillfinder
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Effective {EFFECTIVE_DATE}
        </p>

        <p className="mt-6 leading-7">
          Hillfinder helps you find downhill-friendly routes near you. This
          policy explains what information the app collects, how it&apos;s used,
          who it&apos;s shared with, and how you can delete it. We don&apos;t
          sell your personal information, show ads, or track you across other
          apps and websites.
        </p>

        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Account details.</strong> Your name, email address, and
              optional username. If you sign up with email, we store your
              password only as a one-way hash. If you sign in with Google, we
              receive your name, email address, and profile photo from Google.
            </li>
            <li>
              <strong>Profile photo.</strong> If you upload an avatar, we store
              the image.
            </li>
            <li>
              <strong>Location.</strong> With your permission, the app uses your
              device&apos;s location to show where you are, plan routes from
              your position, and give turn-by-turn guidance. In the iPhone app,
              location keeps updating while your phone is locked, but only during
              a ride you&apos;ve started, so spoken directions continue; it stops
              when the ride ends. We don&apos;t keep a history of your location
              on our servers.
            </li>
            <li>
              <strong>Saved routes.</strong> When you save a route, we store its
              start and end points (including place names), the route path,
              elevation, distance, duration, and directions.
            </li>
            <li>
              <strong>On-device data.</strong> Your settings (theme, voice
              guidance, orientation, guidance style), a short-lived copy of your
              current route so it survives a reload, and offline copies of app
              files are stored in your browser or device, not on our servers.
            </li>
            <li>
              <strong>Usage statistics.</strong> Which pages are visited, the
              referring site, and your browser, operating system, device type,
              and country. This is collected without cookies and isn&apos;t
              linked to your account.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>To create and secure your account and sign you in.</li>
            <li>
              To find, display, and navigate routes, and to save and reopen
              routes you choose to keep.
            </li>
            <li>To send password-reset emails you request.</li>
            <li>
              To protect the service, for example by limiting repeated sign-in
              attempts.
            </li>
            <li>To understand how the app is used so we can improve it.</li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p className="leading-7">
            We share information only with the service providers that run parts
            of the app for us:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Vercel</strong> — hosts the app and provides the
              cookie-free usage statistics described above.
            </li>
            <li>
              <strong>Mapbox</strong> — maps, place search, and directions.
              Locations and search text you use for routing are sent to Mapbox
              to get results.
            </li>
            <li>
              <strong>Google</strong> — sign-in, if you choose &ldquo;Continue
              with Google.&rdquo;
            </li>
            <li>
              <strong>UploadThing</strong> — stores profile photos you upload.
            </li>
            <li>
              <strong>MongoDB</strong> — our database, which stores account
              details and saved routes.
            </li>
            <li>
              <strong>Our email provider</strong> — delivers password-reset
              emails.
            </li>
            <li>
              <strong>DiceBear</strong> — if you have no profile photo, a
              placeholder avatar is generated from your username (or an internal
              account ID if you have none). Your email address isn&apos;t sent.
            </li>
          </ul>
          <p className="mt-3 leading-7">
            We may also disclose information if required by law.
          </p>
        </Section>

        <Section title="Shared route links">
          <p className="leading-7">
            Every saved route has its own link, and anyone who has that link can
            open the route without signing in, whether or not you&apos;ve shared
            it. They can see the route&apos;s map, start and end points
            (including place names), distance, elevation, and directions. The
            link doesn&apos;t show your name or email address. Links are hard to
            guess, but treat them like the route itself: deleting a saved route
            turns its link off.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p className="leading-7">
            We keep your account details and saved routes until you delete them
            or delete your account. You can delete individual saved routes at
            any time.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p className="leading-7">
            You can delete your account from{" "}
            <strong>Settings → Delete account</strong> in the app. This
            permanently removes your account details, saved routes (which also
            turns off their links), and uploaded profile photos from our
            systems, and signs you out on every device. To do that, we keep a
            one-way hash of your email address and the deletion time for 30
            days; it can&apos;t be used to recover your email. If you can&apos;t
            sign in, contact us and we&apos;ll delete your account for you.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You can turn off location access in your device or browser
              settings at any time; route planning from your position won&apos;t
              work without it.
            </li>
            <li>You can update your name and username in your profile.</li>
            <li>
              You can ask us for a copy of your data or to correct it by
              contacting us.
            </li>
          </ul>
        </Section>

        <Section title="Children">
          <p className="leading-7">
            Hillfinder isn&apos;t directed to children under 13, and we
            don&apos;t knowingly collect their personal information.
          </p>
        </Section>

        <Section title="Security">
          <p className="leading-7">
            Data is sent over encrypted connections and passwords are hashed.
            Your list of saved routes and your account details are only
            available when you&apos;re signed in, but an individual saved route
            can be opened by anyone with its link (see &ldquo;Shared route
            links&rdquo;). No system is perfectly secure, but we work to protect
            your information.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p className="leading-7">
            If we change this policy, we&apos;ll update the effective date above
            and, for significant changes, let you know in the app.
          </p>
        </Section>

        <Section title="Contact">
          <p className="leading-7">
            Questions or requests about your privacy:{" "}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-emerald-700 dark:text-emerald-400 underline"
              >
                {email}
              </a>
            ) : (
              "use the contact details on our app store listing"
            )}
            .
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {children}
    </section>
  );
}
