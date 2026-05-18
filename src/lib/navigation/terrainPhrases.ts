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

// ─── Progress phrase bank ─────────────────────────────────────────────────────
// Used for mid-section reassurance when terrain stays consistent over distance.
// "still / continues / remains" language distinguishes these from change cues.

const PROGRESS_PHRASES: Record<TerrainVoiceStyle, Record<TerrainKind, readonly string[]>> = {
  calm: {
    short_uphill: [
      "This climb continues a little longer.",
      "You're still on the uphill stretch.",
      "The rise is still going.",
      "Still climbing — nearly there.",
    ],
    sustained_uphill: [
      "This climb continues. Keep your pace.",
      "You're still on the long uphill.",
      "The climb carries on ahead.",
      "Still on the sustained rise — stay steady.",
    ],
    steep_uphill: [
      "This demanding climb continues.",
      "You're still in the hard climb.",
      "The tough section carries on a bit.",
      "Steep terrain continues ahead.",
    ],
    gentle_downhill: [
      "You're still on a gentle descent.",
      "This downhill stretch continues.",
      "The route stays downhill for now.",
      "You're still in a smooth descent.",
    ],
    sustained_downhill: [
      "You're still on a steady downhill stretch.",
      "This descent keeps going.",
      "The downhill continues ahead.",
      "Terrain remains downhill for now.",
    ],
    steep_downhill: [
      "The steep descent continues. Stay in control.",
      "You're still on the fast downhill.",
      "This steep section carries on.",
      "Steep terrain continues ahead.",
    ],
    flat: [
      "Terrain stays mostly flat here.",
      "The route remains level for now.",
      "You're still on the flat section.",
      "This section stays consistent for a bit.",
    ],
    rolling: [
      "The route stays mixed through here.",
      "You're still on varied terrain.",
      "This rolling section continues.",
      "More mixed terrain ahead.",
    ],
    easing: [
      "Terrain is still leveling out.",
      "The route continues to flatten.",
      "You're still coming off the climb.",
      "Things are still smoothing out.",
    ],
    difficult_ahead: [
      "Difficult terrain continues.",
      "You're still in the challenging section.",
      "This tough stretch carries on.",
      "Hard terrain continues ahead.",
    ],
  },

  energetic: {
    short_uphill: [
      "Still climbing — keep it moving.",
      "The uphill keeps going — stay with it.",
      "This rise continues — push through.",
      "You're still on the climb.",
    ],
    sustained_uphill: [
      "Still on the climb — you've got this.",
      "The uphill keeps going — dig in.",
      "You're still in the long climb — stay strong.",
      "This climb continues — keep pushing.",
    ],
    steep_uphill: [
      "Still on the hard climb — stay strong.",
      "The tough climb continues — give it everything.",
      "You're still pushing through — nearly there.",
      "This demanding climb carries on — dig deep.",
    ],
    gentle_downhill: [
      "Nice, this downhill keeps going.",
      "Still on the descent — enjoy it.",
      "You're still rolling downhill.",
      "This smooth descent continues.",
    ],
    sustained_downhill: [
      "The long downhill just keeps going — love it.",
      "Still on the descent — let it flow.",
      "You're still rolling on the downhill.",
      "This descent continues — enjoy the ride.",
    ],
    steep_downhill: [
      "Still on the steep drop — stay sharp.",
      "The fast descent continues — stay controlled.",
      "You're still on the quick downhill — ride smart.",
      "Steep drop continues — keep it together.",
    ],
    flat: [
      "Still on the flat — use it to recover.",
      "Flat terrain continues — good chance to reset.",
      "You're still on the easy section — stay ready.",
      "The level ground keeps going.",
    ],
    rolling: [
      "More rolling terrain ahead — stay nimble.",
      "Still on the mixed section — keep adapting.",
      "You're still in the ups and downs.",
      "This varied terrain continues — stay on it.",
    ],
    easing: [
      "Almost out — terrain keeps flattening.",
      "Still easing off — nearly through it.",
      "You're still coming out of the tough section.",
      "The terrain is still opening up.",
    ],
    difficult_ahead: [
      "Still in the tough section — keep going.",
      "Hard terrain continues — you've got this.",
      "You're still pushing through — stay focused.",
      "This demanding stretch carries on — dig in.",
    ],
  },

  minimal: {
    short_uphill:     ["Still climbing.", "Climb continues.", "Still on the rise.", "Uphill continues."],
    sustained_uphill: ["Still climbing.", "Long climb continues.", "Still on the rise.", "Climb ahead."],
    steep_uphill:     ["Still on hard climb.", "Steep climb continues.", "Still climbing.", "Climb carries on."],
    gentle_downhill:  ["Still downhill.", "Descent continues.", "Still descending.", "Downhill continues."],
    sustained_downhill: ["Still downhill.", "Descent continues.", "Long descent continues.", "Still descending."],
    steep_downhill:   ["Still steep.", "Descent continues.", "Still dropping.", "Steep continues."],
    flat:             ["Still flat.", "Level continues.", "Flat ahead.", "Still level."],
    rolling:          ["Still rolling.", "Mixed continues.", "Still varied.", "Ups and downs."],
    easing:           ["Still easing.", "Getting flatter.", "Still smoothing out.", "Still leveling."],
    difficult_ahead:  ["Still tough.", "Hard terrain.", "Still difficult.", "Challenging ahead."],
  },
};

const lastProgressIndex = new Map<string, number>();

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

export function getTerrainProgressPhrase(
  kind: TerrainKind,
  style: TerrainVoiceStyle = DEFAULT_TERRAIN_VOICE_STYLE
): string {
  const variants = PROGRESS_PHRASES[style][kind];
  const key = `${style}:${kind}`;
  const prev = lastProgressIndex.get(key) ?? -1;
  const next = pickIndex(variants.length, prev);
  lastProgressIndex.set(key, next);
  return variants[next];
}
