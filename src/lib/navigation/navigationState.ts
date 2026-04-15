import type { NavStep } from "@/lib/navigation/types";

export type NavigationStatus = "idle" | "ready" | "navigating" | "paused" | "completed";

export type LiveNavLocation = {
  lat: number;
  lng: number;
};

export type NavigationState = {
  status: NavigationStatus;
  steps: NavStep[];
  currentStepIndex: number;
  liveLocation: LiveNavLocation | null;
  hasSpokenCurrentStep: boolean;
};

export type NavigationAction =
  | { type: "LOAD_STEPS"; steps: NavStep[] }
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "STOP" }
  | { type: "SET_LOCATION"; location: LiveNavLocation }
  | { type: "ADVANCE_STEP" }
  | { type: "GO_TO_STEP"; index: number }
  | { type: "MARK_STEP_SPOKEN" }
  | { type: "RESET_STEP_SPOKEN" }
  | { type: "COMPLETE" };

export const initialNavigationState: NavigationState = {
  status: "idle",
  steps: [],
  currentStepIndex: 0,
  liveLocation: null,
  hasSpokenCurrentStep: false,
};

export function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case "LOAD_STEPS":
      return {
        ...state,
        status: action.steps.length ? "ready" : "idle",
        steps: action.steps,
        currentStepIndex: 0,
        hasSpokenCurrentStep: false,
      };

    case "START":
      if (!state.steps.length) return state;
      return {
        ...state,
        status: "navigating",
      };

    case "PAUSE":
      return {
        ...state,
        status: "paused",
      };

    case "STOP":
      return {
        ...state,
        status: state.steps.length ? "ready" : "idle",
        currentStepIndex: 0,
        liveLocation: null,
        hasSpokenCurrentStep: false,
      };

    case "SET_LOCATION":
      return {
        ...state,
        liveLocation: action.location,
      };

    case "ADVANCE_STEP": {
      const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
      const isLast = nextIndex >= state.steps.length - 1;

      return {
        ...state,
        currentStepIndex: nextIndex,
        status: isLast ? "completed" : state.status,
        hasSpokenCurrentStep: false,
      };
    }

    case "GO_TO_STEP":
      return {
        ...state,
        currentStepIndex: Math.max(0, Math.min(action.index, state.steps.length - 1)),
        hasSpokenCurrentStep: false,
      };

    case "MARK_STEP_SPOKEN":
      return {
        ...state,
        hasSpokenCurrentStep: true,
      };

    case "RESET_STEP_SPOKEN":
      return {
        ...state,
        hasSpokenCurrentStep: false,
      };

    case "COMPLETE":
      return {
        ...state,
        status: "completed",
      };

    default:
      return state;
  }
}
