export type RoutePoint = {
  lat: number;
  lng: number;
  name?: string;
};

export type RouteSegmentDifficulty = "easy" | "medium" | "hard" | "uphill";

export type SavedRouteSegment = {
  coords: [number, number][];
  difficulty: RouteSegmentDifficulty;
};

export type SavedRouteRecord = {
  _id: string;
  userId?: string;
  name?: string;
  from: RoutePoint;
  to: RoutePoint;
  difficulty: "easy" | "hard";
  coords: [number, number][];
  elevations?: number[];
  segments?: SavedRouteSegment[];
  distanceMeters?: number;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveRoutePayload = {
  name?: string;
  from: RoutePoint;
  to: RoutePoint;
  difficulty: "easy" | "hard";
  coords: [number, number][];
  elevations?: number[];
  segments?: SavedRouteSegment[];
  distanceMeters?: number;
  durationSeconds?: number;
};
