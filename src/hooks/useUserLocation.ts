"use client";

import { useEffect, useState } from "react";

interface LocationState {
  loading: boolean;
  granted: boolean | null; // null = undefined
  coords: {
    lat: number;
    lng: number;
  } | null;
  error: string | null;
}

export default function useUserLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    loading: true,
    granted: null,
    coords: null,
    error: null,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return setState({
        loading: false,
        granted: false,
        coords: null,
        error: "Geolocation not supported by this browser.",
      });
    }

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        setState((prev) => ({ ...prev, granted: permission.state === "granted" }));
      })
      .catch(() => {
        // Some browsers don't support navigator.permissions
      });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          loading: false,
          granted: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          error: null,
        });
      },
      (err) => {
        setState({
          loading: false,
          granted: false,
          coords: null,
          error: err.message || "Unable to get location",
        });
      }
    );
  }, []);

  return state;
}
