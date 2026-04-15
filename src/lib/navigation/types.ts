export type NavStep = {
  index: number;
  instruction: string;
  distance: number;
  duration: number;
  location: [number, number]; // [lng, lat]
  maneuver: {
    lng: number;
    lat: number;
    type?: string;
    modifier?: string;
  };
  spokenAdvance: boolean;
  spokenFinal: boolean;
  completed: boolean;
};

export type MapboxLegStep = {
  distance: number;
  duration: number;
  maneuver: {
    instruction?: string;
    location: [number, number];
    type?: string;
    modifier?: string;
  };
};

export type MapboxRouteLeg = {
  steps?: MapboxLegStep[];
};

export type MapboxRoute = {
  legs?: MapboxRouteLeg[];
};
