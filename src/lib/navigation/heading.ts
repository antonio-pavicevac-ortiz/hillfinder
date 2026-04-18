export function normalizeHeading(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function bearingBetween(a: mapboxgl.LngLat, b: mapboxgl.LngLat) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = toDeg(Math.atan2(y, x));
  return normalizeHeading(brng);
}

export function resolveHeading(params: {
  reportedHeading: number | null;
  previous: mapboxgl.LngLat | null;
  current: mapboxgl.LngLat;
  lastResolvedHeading: number | null;
  speedMps?: number | null;
}) {
  const { reportedHeading, previous, current, lastResolvedHeading, speedMps } = params;

  let movementHeading: number | null = null;

  if (previous) {
    const movedMeters = previous.distanceTo(current);

    if (movedMeters >= 4) {
      movementHeading = bearingBetween(previous, current);
    }
  }

  if (
    (speedMps ?? 0) > 0.8 &&
    typeof movementHeading === "number" &&
    Number.isFinite(movementHeading)
  ) {
    return normalizeHeading(movementHeading);
  }

  if (typeof movementHeading === "number" && Number.isFinite(movementHeading)) {
    return normalizeHeading(movementHeading);
  }

  if (typeof reportedHeading === "number" && Number.isFinite(reportedHeading)) {
    return normalizeHeading(reportedHeading);
  }

  if (typeof lastResolvedHeading === "number" && Number.isFinite(lastResolvedHeading)) {
    return normalizeHeading(lastResolvedHeading);
  }

  return null;
}
