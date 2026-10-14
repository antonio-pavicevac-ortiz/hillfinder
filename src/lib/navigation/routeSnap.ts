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
    return { point, distanceMeters: Infinity, bearing: null as number | null, segmentIndex: 0 };
  }

  if (coords.length === 1) {
    const snapped = new mapboxgl.LngLat(coords[0][0], coords[0][1]);
    return {
      point: snapped,
      distanceMeters: point.distanceTo(snapped),
      bearing: null as number | null,
      segmentIndex: 0,
    };
  }

  let bestPoint = point;
  let bestDistance = Infinity;
  let bestBearing: number | null = null;
  // Index of the segment's start coordinate, i.e. how far along the route the point is
  let bestSegmentIndex = 0;

  for (let i = 1; i < coords.length; i++) {
    const candidate = snapPointToSegment(point, coords[i - 1], coords[i]);
    if (candidate.distanceMeters < bestDistance) {
      bestDistance = candidate.distanceMeters;
      bestPoint = candidate.point;
      bestBearing = candidate.bearing;
      bestSegmentIndex = i - 1;
    }
  }

  return {
    point: bestPoint,
    distanceMeters: bestDistance,
    bearing: bestBearing,
    segmentIndex: bestSegmentIndex,
  };
}

// Where to rejoin after leaving the route: the closest route point past the last place the
// rider was on it. Never behind it, so getting back doesn't mean redoing (or reversing) a
// stretch they've already ridden.
export function findRejoinPoint(
  point: mapboxgl.LngLat,
  coords: [number, number][],
  lastOnRouteSegmentIndex: number
): [number, number] | null {
  let best: [number, number] | null = null;
  let bestDistance = Infinity;

  for (let i = Math.max(0, lastOnRouteSegmentIndex + 1); i < coords.length; i++) {
    const distance = point.distanceTo(new mapboxgl.LngLat(coords[i][0], coords[i][1]));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = coords[i];
    }
  }

  return best;
}
