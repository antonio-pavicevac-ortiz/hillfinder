export type DistanceUnit = "imperial" | "metric";

type FormatOptions = {
  unit?: DistanceUnit;
  precision?: number; // for miles/km
};

export function formatStepDistance(meters: number | null, options: FormatOptions = {}) {
  const { unit = "imperial", precision = 1 } = options;

  if (meters == null || !Number.isFinite(meters)) return "";

  if (unit === "metric") {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }

    const km = meters / 1000;
    return `${km.toFixed(precision)} km`;
  }

  // imperial (default)
  const feet = meters * 3.28084;

  if (feet < 1000) {
    return `${Math.round(feet)} ft`;
  }

  const miles = meters / 1609.34;
  return `${miles.toFixed(precision)} mi`;
}

export function formatBearingToDirection(bearing: number | null) {
  if (bearing == null || !Number.isFinite(bearing)) return "";

  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return dirs[index];
}

export function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "";

  const mins = Math.round(seconds / 60);

  if (mins < 60) return `${mins} min`;

  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;

  return `${hours}h ${remaining}m`;
}
