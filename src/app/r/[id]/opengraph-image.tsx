import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type SharedRoute = {
  difficulty?: string;
  from?: { name?: string };
  to?: { name?: string };
  coords?: [number, number][];
};

function shortAreaName(name?: string) {
  if (!name) return "";
  const parts = name.split(",").map((p) => p.trim());
  return parts[1] || parts[0] || "";
}

function buildPolylinePoints(coords?: [number, number][]) {
  if (!coords || coords.length < 2) return "";

  const lngs = coords.map((point) => Number(point[0]));
  const lats = coords.map((point) => Number(point[1]));

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;

  const width = 980;
  const height = 300;
  const pad = 30;

  return coords
    .map(([lngRaw, latRaw]) => {
      const lng = Number(lngRaw);
      const lat = Number(latRaw);

      const x = pad + ((lng - minLng) / lngRange) * (width - pad * 2);
      const y = pad + (1 - (lat - minLat) / latRange) * (height - pad * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

function getStartEnd(points: string) {
  if (!points) {
    return {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    };
  }

  const pts = points.split(" ");
  const first = pts[0]?.split(",") ?? ["0", "0"];
  const last = pts[pts.length - 1]?.split(",") ?? ["0", "0"];

  return {
    startX: Number(first[0]),
    startY: Number(first[1]),
    endX: Number(last[0]),
    endY: Number(last[1]),
  };
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let route: SharedRoute | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/routes/${id}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      route = data.route;
    }
  } catch (err) {
    console.error("[opengraph-image]", err);
  }

  const fromName = shortAreaName(route?.from?.name) || "From";
  const toName = shortAreaName(route?.to?.name) || "Destination";
  const difficulty = route?.difficulty?.toUpperCase() || "ROUTE";

  const polylinePoints = buildPolylinePoints(route?.coords);
  const { startX, startY, endX, endY } = getStartEnd(polylinePoints);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "40px",
        background: "linear-gradient(to bottom, #E1F5C4, #EDE574)",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "320px",
            display: "flex",
            borderRadius: "28px",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 100%)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <svg
            width="1120"
            height="320"
            viewBox="0 0 1120 320"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: "absolute",
              inset: "0",
            }}
          >
            <rect width="1120" height="320" fill="#eef7d5" />
            <rect width="1120" height="320" fill="url(#terrain)" opacity="0.9" />

            <path d="M60 70 C120 20, 220 20, 300 85 C260 150, 170 165, 90 145 Z" fill="#cfe8b0" />
            <path
              d="M780 45 C870 10, 1010 40, 1050 120 C995 170, 860 175, 790 110 Z"
              fill="#cfe8b0"
            />
            <path
              d="M880 210 C950 180, 1035 195, 1075 255 C1025 305, 930 300, 870 260 Z"
              fill="#d8edbb"
            />

            <path d="M20 250 L350 120 L620 160 L1080 70" stroke="#d8cf8e" strokeWidth="12" />
            <path d="M40 255 L355 125 L620 165 L1080 75" stroke="#f4e6b4" strokeWidth="6" />
            <path d="M180 20 L250 300" stroke="#d8cf8e" strokeWidth="10" />
            <path d="M185 20 L255 300" stroke="#f4e6b4" strokeWidth="5" />
            <path d="M560 0 L450 320" stroke="#d8cf8e" strokeWidth="8" />
            <path d="M564 0 L454 320" stroke="#f4e6b4" strokeWidth="4" />

            <path d="M110 40 L420 260" stroke="#ffffff" strokeWidth="2" opacity="0.45" />
            <path d="M320 20 L650 280" stroke="#ffffff" strokeWidth="2" opacity="0.45" />
            <path d="M720 40 L1030 220" stroke="#ffffff" strokeWidth="2" opacity="0.45" />
            <path d="M0 120 L1120 120" stroke="#ffffff" strokeWidth="2" opacity="0.28" />
            <path d="M0 190 L1120 190" stroke="#ffffff" strokeWidth="2" opacity="0.28" />
            <path d="M0 260 L1120 260" stroke="#ffffff" strokeWidth="2" opacity="0.28" />

            {polylinePoints ? (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(15,23,42,0.18)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {polylinePoints ? (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#16a34a"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {polylinePoints ? (
              <circle
                cx={String(startX)}
                cy={String(startY)}
                r="12"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="5"
              />
            ) : null}

            {polylinePoints ? (
              <circle
                cx={String(endX)}
                cy={String(endY)}
                r="12"
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="5"
              />
            ) : null}

            <defs>
              <linearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#edf7d7" />
                <stop offset="100%" stopColor="#e6efaf" />
              </linearGradient>
            </defs>
          </svg>

          <div
            style={{
              position: "absolute",
              top: "24px",
              left: "24px",
              display: "flex",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.84)",
              padding: "10px 18px",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Hillfinder
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingLeft: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.78)",
              padding: "10px 18px",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "#334155",
            }}
          >
            {difficulty}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "94%",
              color: "#0f172a",
            }}
          >
            {fromName} → {toName}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#334155",
            }}
          >
            Shared downhill route
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
