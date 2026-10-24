import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True inside the iPhone app. The server can't tell, so server-rendered markup assumes the
 * website and the app switches over during hydration; client-side navigations see the
 * right value from the first render.
 */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribe, () => Capacitor.isNativePlatform(), () => false);
}
