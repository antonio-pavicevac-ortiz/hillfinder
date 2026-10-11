type ReadyMap = {
  isStyleLoaded: () => boolean;
  on: (event: "load" | "styledata" | "idle", listener: () => void) => unknown;
  off: (event: "load" | "styledata" | "idle", listener: () => void) => unknown;
};

// Terrain/source updates can make the style temporarily unready after "load".
export function restoreWhenStyleReady(map: ReadyMap, restore: () => void): () => void {
  const events = ["load", "styledata", "idle"] as const;
  let finished = false;
  const cancel = () => {
    finished = true;
    for (const event of events) map.off(event, attempt);
  };
  const attempt = () => {
    if (finished || !map.isStyleLoaded()) return;
    // Remove listeners before drawing: adding route sources fires more events.
    cancel();
    restore();
  };
  for (const event of events) map.on(event, attempt);
  attempt();
  return cancel;
}
