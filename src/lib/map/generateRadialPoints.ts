export function generateRadialPoints(
  start: { lat: number; lng: number },
  count = 8,
  distanceMeters = 1000
) {
  const earthRadius = 6378137;

  const results: { lat: number; lng: number }[] = [];

  const latRad = (start.lat * Math.PI) / 180;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;

    const dx = distanceMeters * Math.cos(angle);
    const dy = distanceMeters * Math.sin(angle);

    const dLat = dy / earthRadius;
    const dLng = dx / (earthRadius * Math.cos(latRad));

    const lat = start.lat + (dLat * 180) / Math.PI;
    const lng = start.lng + (dLng * 180) / Math.PI;

    results.push({ lat, lng });
  }

  return results;
}
