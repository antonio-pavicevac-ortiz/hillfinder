export type TerrainKind =
  | "short_uphill"
  | "sustained_uphill"
  | "steep_uphill"
  | "gentle_downhill"
  | "sustained_downhill"
  | "steep_downhill"
  | "flat"
  | "rolling"
  | "easing"
  | "difficult_ahead";

// ─── Copy bank ────────────────────────────────────────────────────────────────
// Each kind has ≥ 4 variants so consecutive triggers never repeat the same line.
// Keep phrases short — they are read aloud during navigation.

const PHRASES: Record<TerrainKind, readonly string[]> = {
  short_uphill: [
    "Short climb ahead.",
    "Quick rise coming up.",
    "Brief uphill ahead.",
    "Small climb ahead.",
  ],

  sustained_uphill: [
    "Longer climb coming up. Take it steady.",
    "Extended climb ahead — keep your pace.",
    "Sustained rise ahead. Settle in.",
    "Long climb coming up. Pace yourself.",
  ],

  steep_uphill: [
    "Long, demanding climb ahead. Take your time.",
    "Extended climb ahead. Conserve your energy.",
    "Hard climb coming up. Go at your own pace.",
    "Tough climb ahead. Steady does it.",
  ],

  gentle_downhill: [
    "Gentle downhill ahead.",
    "Easy descent coming up.",
    "Slight decline ahead.",
    "Smooth downhill stretch ahead.",
  ],

  sustained_downhill: [
    "Longer downhill stretch coming up.",
    "Extended descent ahead.",
    "Good long descent ahead.",
    "Long downhill stretch coming up.",
  ],

  steep_downhill: [
    "Steep descent ahead. Watch your speed.",
    "Sharp drop coming up. Stay in control.",
    "Steep downhill ahead. Take care.",
    "Fast descent ahead — stay alert.",
  ],

  flat: [
    "Flat section ahead.",
    "Level ground coming up.",
    "Easy, flat stretch ahead.",
    "Flat terrain ahead.",
  ],

  rolling: [
    "Some ups and downs ahead.",
    "Mixed terrain coming up.",
    "Rolling hills ahead.",
    "Varied terrain ahead.",
  ],

  easing: [
    "Terrain eases up after this section.",
    "It gets flatter ahead.",
    "This section smooths out soon.",
    "The hard part is nearly done.",
  ],

  difficult_ahead: [
    "Challenging section ahead.",
    "Tougher terrain coming up.",
    "Difficult stretch ahead.",
    "This next section gets demanding.",
  ],
};

// ─── Deduplication ────────────────────────────────────────────────────────────
// Tracks the last phrase index returned per kind so consecutive calls for the
// same kind never produce the same line back-to-back.

const lastIndex = new Map<TerrainKind, number>();

function pickIndex(length: number, exclude: number): number {
  if (length === 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * length);
  } while (idx === exclude);
  return idx;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTerrainGuidancePhrase(kind: TerrainKind): string {
  const variants = PHRASES[kind];
  const prev = lastIndex.get(kind) ?? -1;
  const next = pickIndex(variants.length, prev);
  lastIndex.set(kind, next);
  return variants[next];
}
