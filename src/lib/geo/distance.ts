export function haversineMeters(a: [number, number], b: [number, number]) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);

  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
