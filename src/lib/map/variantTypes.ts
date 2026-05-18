import type { buildNavSteps } from "@/lib/navigation/progress";
import type { SavedRouteSegment } from "@/types/saved-route";

export type VariantKey = "easy" | "hard";

export type Variant = {
  coords: [number, number][];
  elevations: number[];
  easyScore: number;
  hardScore: number;
  distanceMeters?: number;
  durationSeconds?: number;
  segments?: SavedRouteSegment[];
  navSteps?: ReturnType<typeof buildNavSteps>;
};

export type DirectionsApiRoute = {
  distance?: number;
  duration?: number;
  geometry?: {
    coordinates?: [number, number][];
  };
  legs?: Array<{
    steps?: any[];
  }>;
};
