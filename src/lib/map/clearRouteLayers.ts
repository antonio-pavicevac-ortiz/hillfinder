export function clearRouteLayers(map: mapboxgl.Map, prefix = "route-segment-") {
  if (!map.isStyleLoaded()) {
    map.once("load", () => clearRouteLayers(map, prefix));
    return;
  }

  const layers = map.getStyle().layers ?? [];
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
