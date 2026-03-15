type SharedRoutePageProps = {
  params: {
    id: string;
  };
};

type SharedRoute = {
  _id: string;
  name?: string;
  difficulty: string;
  from: { name?: string };
  to: { name?: string };
  distanceMeters?: number;
  durationSeconds?: number;
};

function formatDistance(distanceMeters?: number) {
  if (!distanceMeters) return null;
  const miles = distanceMeters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds) return null;
  const minutes = Math.round(durationSeconds / 60);
  return `${minutes} min`;
}

function shortAreaName(name?: string) {
  if (!name) return "";
  const parts = name.split(",").map((p) => p.trim());
  return parts[1] || parts[0] || "";
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title: "Hillfinder Shared Route",
    description: "Check out this shared Hillfinder route.",
    openGraph: {
      title: "Hillfinder Shared Route",
      description: "Check out this shared Hillfinder route.",
      images: [`${baseUrl}/r/${params.id}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: "Hillfinder Shared Route",
      description: "Check out this shared Hillfinder route.",
      images: [`${baseUrl}/r/${params.id}/opengraph-image`],
    },
  };
}

export default async function SharedRoutePage({ params }: SharedRoutePageProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/routes/${params.id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="bg-hillfinder-gradient h-44" />

        <div className="mx-auto -mt-20 max-w-xl px-6 pb-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-sm font-medium text-slate-500">Hillfinder</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Shared route not found</h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              This shared Hillfinder route may have been removed or is unavailable.
            </p>

            <a
              href="/dashboard"
              className="mt-6 inline-flex rounded-2xl bg-brandGreen px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brandGreen-dark"
            >
              Open Hillfinder
            </a>
          </div>
        </div>
      </main>
    );
  }

  const data: { route: SharedRoute } = await res.json();
  const route = data.route;

  const title = `${shortAreaName(route.from?.name) || "From"} → ${shortAreaName(route.to?.name) || "Destination"}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-hillfinder-gradient h-44" />

      <div className="mx-auto -mt-20 max-w-xl px-6 pb-10">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-6 pt-6 pb-5">
            <p className="text-sm font-medium text-slate-500">Hillfinder</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Shared Route</h1>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
              <h2 className="text-xl font-semibold leading-7 text-slate-900">{title}</h2>

              <div className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-200">
                {route.difficulty}
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">From:</span>{" "}
                  {route.from?.name || "From"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">To:</span>{" "}
                  {route.to?.name || "Destination"}
                </p>
              </div>

              {(route.distanceMeters || route.durationSeconds) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {route.distanceMeters ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                      {formatDistance(route.distanceMeters)}
                    </span>
                  ) : null}

                  {route.durationSeconds ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                      {formatDuration(route.durationSeconds)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="inline-flex rounded-2xl bg-brandGreen px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brandGreen-dark"
              >
                Open Hillfinder
              </a>

              <a
                href={`/dashboard?sharedRoute=${params.id}`}
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                View in app
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
