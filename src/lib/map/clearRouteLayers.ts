// Clears route segment layers/sources by prefix (default: "route-segment-").
// Note: the traveling sweep overlay ("route-sweep") is managed separately in DashboardMap.
export function clearRouteLayers(map: mapboxgl.Map, prefix = "route-segment-") {
  // Source updates can temporarily make isStyleLoaded() false even though
  // existing layers are removable. Waiting for "load" can leave old segments
  // indefinitely when a shorter route replaces a longer one.
  let layers: { id: string }[];
  try {
    layers = map.getStyle()?.layers ?? [];
  } catch {
    // During initial style construction getStyle() itself can throw. There
    // are no accessible route layers yet; later drawing clears them again.
    return;
  }
  for (const l of layers) {
    if (!l.id.startsWith(prefix)) continue;

    // Must remove layer before source
    try {
      if (map.getLayer(l.id)) map.removeLayer(l.id);
    } catch {}

    try {
      if (map.getSource(l.id)) map.removeSource(l.id);
    } catch {}
  }
}
