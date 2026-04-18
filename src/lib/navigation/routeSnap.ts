import mapboxgl from "mapbox-gl";

function projectLngLatToLocalMeters(originLat: number, point: { lng: number; lat: number }) {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.max(0.2, Math.cos((originLat * Math.PI) / 180));

  return {
    x: point.lng * metersPerDegLng,
    y: point.lat * metersPerDegLat,
  };
}

export function snapPointToSegment(
  point: mapboxgl.LngLat,
  start: [number, number],
  end: [number, number]
) {
  const originLat = (point.lat + start[1] + end[1]) / 3;

  const p = projectLngLatToLocalMeters(originLat, {
    lng: point.lng,
    lat: point.lat,
  });
  const a = projectLngLatToLocalMeters(originLat, {
    lng: start[0],
    lat: start[1],
  });
  const b = projectLngLatToLocalMeters(originLat, {
    lng: end[0],
    lat: end[1],
  });

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  const bearingRad = Math.atan2(abx, aby);
  const bearing = ((bearingRad * 180) / Math.PI + 360) % 360;

  if (abLenSq === 0) {
    const snapped = new mapboxgl.LngLat(start[0], start[1]);
    return {
      point: snapped,
      distanceMeters: point.distanceTo(snapped),
      bearing,
    };
  }

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

  const snappedLng = start[0] + (end[0] - start[0]) * t;
  const snappedLat = start[1] + (end[1] - start[1]) * t;
  const snapped = new mapboxgl.LngLat(snappedLng, snappedLat);

  return {
    point: snapped,
    distanceMeters: point.distanceTo(snapped),
    bearing,
  };
}

export function snapPointToRoute(point: mapboxgl.LngLat, coords: [number, number][]) {
  if (coords.length === 0) {
    return { point, distanceMeters: Infinity, bearing: null as number | null };
  }

  if (coords.length === 1) {
    const snapped = new mapboxgl.LngLat(coords[0][0], coords[0][1]);
    return {
      point: snapped,
      distanceMeters: point.distanceTo(snapped),
      bearing: null as number | null,
    };
  }

  let bestPoint = point;
  let bestDistance = Infinity;
  let bestBearing: number | null = null;

  for (let i = 1; i < coords.length; i++) {
    const candidate = snapPointToSegment(point, coords[i - 1], coords[i]);
    if (candidate.distanceMeters < bestDistance) {
      bestDistance = candidate.distanceMeters;
      bestPoint = candidate.point;
      bestBearing = candidate.bearing;
    }
  }

  return {
    point: bestPoint,
    distanceMeters: bestDistance,
    bearing: bestBearing,
  };
}
