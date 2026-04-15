import { haversineMeters } from "@/lib/geo/distance";
import type { MapboxRoute, NavStep } from "@/lib/navigation/types";

export function buildNavSteps(route: MapboxRoute): NavStep[] {
  const legs = route.legs ?? [];

  return legs
    .flatMap((leg) =>
      (leg.steps ?? []).map((step, indexWithinLeg) => {
        const [lng, lat] = step.maneuver.location;

        return {
          index: indexWithinLeg,
          instruction: step.maneuver.instruction?.trim() || "Continue",
          distance: step.distance,
          duration: step.duration,
          location: [lng, lat] as [lng: number, lat: number],
          maneuver: {
            lng,
            lat,
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
          },
          spokenAdvance: false,
          spokenFinal: false,
          completed: false,
        };
      })
    )
    .map((step, globalIndex) => ({
      ...step,
      index: globalIndex,
    }));
}

export function distanceToStepMeters(user: { lat: number; lng: number }, step: NavStep) {
  return haversineMeters([user.lng, user.lat], [step.maneuver.lng, step.maneuver.lat]);
}

export function shouldAdvanceStep(
  user: { lat: number; lng: number },
  step: NavStep,
  thresholdMeters = 25
) {
  return distanceToStepMeters(user, step) <= thresholdMeters;
}

export function getManeuverSymbol(step?: NavStep) {
  const modifier = step?.maneuver?.modifier;
  const type = step?.maneuver?.type;

  if (type === "arrive") return "●";
  if (modifier === "left" || modifier === "slight left" || modifier === "sharp left") return "←";
  if (modifier === "right" || modifier === "slight right" || modifier === "sharp right") return "→";
  if (modifier === "straight") return "↑";
  if (modifier === "uturn") return "↺";

  return "↑";
}
