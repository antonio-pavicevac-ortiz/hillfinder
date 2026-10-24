import type { BackgroundGeolocationPlugin, Location } from "@capacitor-community/background-geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Device location for the map and navigation. In the iPhone app it comes from a native
// plugin, which keeps reporting while the phone is locked; on the web it's the browser's
// geolocation, which stops when the page is hidden.

export type DevicePosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

type PositionHandler = (pos: DevicePosition) => void;
type ErrorHandler = () => void;
type Subscriber = { onPosition: PositionHandler; onError?: ErrorHandler };

const ONCE_TIMEOUT_MS = 8000;

// The plugin ships no JS wrapper; this binds to its native implementation
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

const isNative = () => Capacitor.isNativePlatform();

function fromNative(location: Location): DevicePosition {
  return {
    coords: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.bearing,
      speed: location.speed,
    },
    timestamp: location.time ?? Date.now(),
  };
}

function fromBrowser(pos: GeolocationPosition): DevicePosition {
  const { latitude, longitude, accuracy, heading, speed } = pos.coords;
  return { coords: { latitude, longitude, accuracy, heading, speed }, timestamp: pos.timestamp };
}

// The app runs one native watcher shared by every subscriber, so switching it to background
// mode for navigation doesn't need each caller to restart its own watch
const subscribers = new Set<Subscriber>();
let background = false;
let nativeWatcherId: string | null = null;
// Watcher changes are async; chaining them keeps a quick stop/start from overlapping
let nativeQueue: Promise<void> = Promise.resolve();

function syncNativeWatcher() {
  nativeQueue = nativeQueue
    .then(async () => {
      if (nativeWatcherId) {
        await BackgroundGeolocation.removeWatcher({ id: nativeWatcherId });
        nativeWatcherId = null;
      }
      if (subscribers.size === 0) return;

      nativeWatcherId = await BackgroundGeolocation.addWatcher(
        {
          // A background message is what makes the plugin keep running while locked, and
          // what makes iOS ask for "Always" location
          backgroundMessage: background ? "Hillfinder is guiding your ride." : undefined,
          requestPermissions: true,
          stale: false,
          distanceFilter: 0,
        },
        (location, error) => {
          if (error || !location) {
            subscribers.forEach((s) => s.onError?.());
            return;
          }
          const pos = fromNative(location);
          subscribers.forEach((s) => s.onPosition(pos));
        }
      );
    })
    .catch((err) => {
      console.error("[location] native watcher failed", err);
      subscribers.forEach((s) => s.onError?.());
    });
}

/** Calls onPosition with every new fix until the returned function is called. */
export function watchLocation(onPosition: PositionHandler, onError?: ErrorHandler): () => void {
  if (!isNative()) {
    const id = navigator.geolocation.watchPosition(
      (pos) => onPosition(fromBrowser(pos)),
      () => onError?.(),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }

  const subscriber: Subscriber = { onPosition, onError };
  subscribers.add(subscriber);
  if (subscribers.size === 1) syncNativeWatcher();

  return () => {
    if (!subscribers.delete(subscriber)) return;
    if (subscribers.size === 0) syncNativeWatcher();
  };
}

/**
 * Keeps location updates coming while the phone is locked, in the iPhone app. Turned on for
 * navigation only, so iOS asks for "Always" location when the rider starts a ride rather
 * than on first launch. Does nothing on the web.
 */
export function setBackgroundLocation(enabled: boolean) {
  if (!isNative() || background === enabled) return;
  background = enabled;
  if (subscribers.size > 0) syncNativeWatcher();
}

/** Calls exactly one of onPosition or onError, unless cancelled with the returned function. */
export function getLocationOnce(onPosition: PositionHandler, onError?: ErrorHandler): () => void {
  if (!isNative()) {
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) onPosition(fromBrowser(pos));
      },
      () => {
        if (!cancelled) onError?.();
      },
      { enableHighAccuracy: true, timeout: ONCE_TIMEOUT_MS, maximumAge: 0 }
    );
    return () => {
      cancelled = true;
    };
  }

  let done = false;
  const finish = (pos?: DevicePosition) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    stop();
    if (pos) onPosition(pos);
    else onError?.();
  };
  const timer = setTimeout(() => finish(), ONCE_TIMEOUT_MS);
  const stop = watchLocation(finish, () => finish());

  return () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    stop();
  };
}
