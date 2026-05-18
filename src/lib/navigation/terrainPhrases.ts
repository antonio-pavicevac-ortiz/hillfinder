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

export type TerrainVoiceStyle = "calm" | "energetic" | "minimal";

export const DEFAULT_TERRAIN_VOICE_STYLE: TerrainVoiceStyle = "calm";
export const TERRAIN_STYLE_STORAGE_KEY = "hf_terrain_style";

// ─── TTS settings per style ───────────────────────────────────────────────────
// Applied to SpeechSynthesisUtterance when speaking terrain narrations.

export const STYLE_TTS: Record<TerrainVoiceStyle, { rate: number; pitch: number }> = {
  calm:      { rate: 0.92, pitch: 0.95 },
  energetic: { rate: 1.08, pitch: 1.05 },
  minimal:   { rate: 1.0,  pitch: 1.0  },
};

// ─── Copy bank ────────────────────────────────────────────────────────────────
// 4 variants per kind per style — consecutive triggers never repeat the same line.
// Keep phrases short: they are read aloud during navigation.

const PHRASES: Record<TerrainVoiceStyle, Record<TerrainKind, readonly string[]>> = {
  calm: {
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
  },

  energetic: {
    short_uphill: [
      "Short climb coming up — keep it moving.",
      "Quick rise ahead.",
      "Brief uphill — stay with it.",
      "Small climb ahead, you've got this.",
    ],
    sustained_uphill: [
      "Longer climb ahead — you've got this.",
      "Extended climb coming up. Dig in.",
      "Long rise ahead. Keep pushing.",
      "Sustained climb — stay strong.",
    ],
    steep_uphill: [
      "Big climb ahead — you can do this.",
      "Hard climb coming up. Give it everything.",
      "Long, tough climb ahead. Dig deep.",
      "Demanding climb — push through it.",
    ],
    gentle_downhill: [
      "Nice little downhill coming up.",
      "Easy descent ahead — enjoy it.",
      "Smooth drop ahead.",
      "Gentle descent coming up.",
    ],
    sustained_downhill: [
      "Nice long downhill coming up — enjoy it.",
      "Great descent ahead.",
      "Long downhill stretch — this is your reward.",
      "Extended descent coming up — let it flow.",
    ],
    steep_downhill: [
      "Big descent ahead — stay controlled.",
      "Steep drop coming up — ride it smart.",
      "Fast downhill ahead. Stay sharp.",
      "Sharp descent ahead — stay in control.",
    ],
    flat: [
      "Flat stretch ahead — good chance to recover.",
      "Easy section coming up.",
      "Level ground — reset and breathe.",
      "Flat section ahead — use it.",
    ],
    rolling: [
      "Rolling terrain ahead — stay nimble.",
      "Mixed ups and downs coming up.",
      "Rolling hills ahead — keep your rhythm.",
      "Varied terrain — stay adaptable.",
    ],
    easing: [
      "Almost through it — terrain eases ahead.",
      "Easier ground coming up — keep going.",
      "Nearly out of the hard section.",
      "Terrain opens up ahead — nearly there.",
    ],
    difficult_ahead: [
      "Tough section coming up — you've got this.",
      "Challenging stretch ahead — stay focused.",
      "Demanding terrain ahead — bring it.",
      "Hard section ahead — dig in.",
    ],
  },

  minimal: {
    short_uphill:     ["Climb ahead.", "Short rise.", "Uphill ahead.", "Brief climb."],
    sustained_uphill: ["Long climb.", "Extended uphill.", "Sustained climb.", "Climb ahead."],
    steep_uphill:     ["Hard climb.", "Steep uphill.", "Demanding climb.", "Long hard climb."],
    gentle_downhill:  ["Downhill ahead.", "Gentle descent.", "Easy drop.", "Decline ahead."],
    sustained_downhill: ["Long downhill.", "Extended descent.", "Downhill stretch.", "Descent ahead."],
    steep_downhill:   ["Steep descent.", "Sharp drop.", "Fast downhill.", "Steep drop."],
    flat:             ["Flat ahead.", "Level ground.", "Easy section.", "Flat terrain."],
    rolling:          ["Rolling terrain.", "Ups and downs.", "Mixed terrain.", "Varied ahead."],
    easing:           ["Easing soon.", "Gets easier.", "Terrain eases.", "Flatter ahead."],
    difficult_ahead:  ["Difficult ahead.", "Tough section.", "Hard stretch.", "Challenging terrain."],
  },
};

// ─── Deduplication ────────────────────────────────────────────────────────────
// Tracks the last index returned per style+kind so consecutive calls never
// produce the same line back-to-back.

const lastIndex = new Map<string, number>();

function pickIndex(length: number, exclude: number): number {
  if (length === 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * length);
  } while (idx === exclude);
  return idx;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTerrainGuidancePhrase(
  kind: TerrainKind,
  style: TerrainVoiceStyle = DEFAULT_TERRAIN_VOICE_STYLE
): string {
  const variants = PHRASES[style][kind];
  const key = `${style}:${kind}`;
  const prev = lastIndex.get(key) ?? -1;
  const next = pickIndex(variants.length, prev);
  lastIndex.set(key, next);
  return variants[next];
}
