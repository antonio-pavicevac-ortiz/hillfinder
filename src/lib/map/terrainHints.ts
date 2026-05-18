import { haversineMeters } from "@/lib/geo/distance";
import type { buildNavSteps } from "@/lib/navigation/progress";
import type { SavedRouteSegment } from "@/types/saved-route";

export function terrainHintFromDifficulty(difficulty?: string) {
  if (difficulty === "easy") return "Mostly smooth terrain.";
  if (difficulty === "medium") return "Moderate terrain ahead.";
  if (difficulty === "uphill") return "Uphill section ahead.";
  if (difficulty === "hard") return "Steeper terrain ahead.";

  return null;
}

export function attachTerrainHintsToNavSteps(
  navSteps: ReturnType<typeof buildNavSteps>,
  segments: SavedRouteSegment[]
) {
  if (!navSteps?.length || !segments?.length) return navSteps;

  return navSteps.map((step) => {
    const stepLocation = step.location;

    if (!stepLocation) return step;

    const matchingSegment = segments.find((segment) => {
      return segment.coords.some(([lng, lat]) => {
        const distance = haversineMeters([lng, lat], stepLocation);
        return distance < 45;
      });
    });

    const terrainHint = terrainHintFromDifficulty(matchingSegment?.difficulty);

    return {
      ...step,
      terrainHint,
    };
  });
}
