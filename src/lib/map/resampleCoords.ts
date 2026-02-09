// Resample a polyline so points are spaced ~`stepMeters` apart.
// Uses haversine distance so lng/lat scaling is accurate (important off the equator).
export function resampleCoords(coords: [number, number][], stepMeters = 15): [number, number][] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]];

  const result: [number, number][] = [];

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversineMeters = (lng1: number, lat1: number, lng2: number, lat2: number) => {
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const lat1r = toRad(lat1);
    const lat2r = toRad(lat2);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];

    result.push([lng1, lat1]);

    const distanceMeters = haversineMeters(lng1, lat1, lng2, lat2);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) continue;

    const steps = Math.floor(distanceMeters / stepMeters);
    if (steps < 1) continue;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      result.push([lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t]);
    }
  }

  result.push(coords[coords.length - 1]);
  return result;
}
