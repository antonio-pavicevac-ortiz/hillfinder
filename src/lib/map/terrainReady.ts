import mapboxgl from "mapbox-gl";

/**
 * iOS Safari-proof elevation helper
 * - Try `map.queryTerrainElevation` first
 * - Fallback to decoding `mapbox.terrain-rgb` tiles
 * - Cache decoded tiles for speed (keyed by z/x/y)
 */

export type TileKey = string;

type Options = {
  /** A decoded-tile cache shared by the caller (per-map-session). */
  tileCache: Map<TileKey, Promise<Uint8ClampedArray>>;
  /** DEM tileset id; default: mapbox.terrain-rgb */
  demTileset?: string;
  /** Zoom to sample at; default: 14 (matches Mapbox terrain-rgb maxzoom) */
  elevZoom?: number;
  /** Access token resolver (lets you use env var or mapboxgl.accessToken). */
  getAccessToken: () => string | undefined;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function tilePixelXY(lng: number, lat: number, z: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** z;

  const xFloat = ((lng + 180) / 360) * n;
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xFloat);
  const yTile = Math.floor(yFloat);

  const xFrac = xFloat - xTile;
  const yFrac = yFloat - yTile;

  const px = clamp(Math.floor(xFrac * 256), 0, 255);
  const py = clamp(Math.floor(yFrac * 256), 0, 255);

  return { xTile: clamp(xTile, 0, n - 1), yTile: clamp(yTile, 0, n - 1), px, py };
}

function decodeTerrainRgb(r: number, g: number, b: number) {
  // Mapbox Terrain-RGB: elevation(m) = -10000 + (R*256*256 + G*256 + B) * 0.1
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

async function decodeTileToRGBA(url: string): Promise<Uint8ClampedArray> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Terrain tile fetch failed: ${res.status}`);
  const blob = await res.blob();

  const bitmap = await createImageBitmap(blob);

  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(256, 256)
      : (document.createElement("canvas") as HTMLCanvasElement);

  // Size for both canvas types
  // @ts-ignore
  canvas.width = 256;
  // @ts-ignore
  canvas.height = 256;

  // @ts-ignore
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D context for terrain decode");

  // @ts-ignore
  ctx.drawImage(bitmap, 0, 0, 256, 256);
  // @ts-ignore
  const img = ctx.getImageData(0, 0, 256, 256);
  return img.data; // RGBA array
}

function getTileUrl(opts: Options, z: number, x: number, y: number) {
  const token = opts.getAccessToken() || mapboxgl.accessToken;
  const tileset = opts.demTileset ?? "mapbox.terrain-rgb";
  // v4 terrain-rgb tiles
  return `https://api.mapbox.com/v4/${tileset}/${z}/${x}/${y}.pngraw?access_token=${token}`;
}

async function getElevationTerrainRgb(
  opts: Options,
  lng: number,
  lat: number
): Promise<number | null> {
  try {
    const z = opts.elevZoom ?? 14;
    const { xTile, yTile, px, py } = tilePixelXY(lng, lat, z);
    const key = `${z}/${xTile}/${yTile}`;
    const url = getTileUrl(opts, z, xTile, yTile);

    let p = opts.tileCache.get(key);
    if (!p) {
      p = decodeTileToRGBA(url);
      opts.tileCache.set(key, p);
    }

    const rgba = await p;
    const idx = (py * 256 + px) * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];

    const elev = decodeTerrainRgb(r, g, b);
    return Number.isFinite(elev) ? elev : null;
  } catch {
    return null;
  }
}

/**
 * Returns an async elevation getter.
 * Call signature: (map, lng, lat) => Promise<number>
 */
export function createTerrainElevationGetter(options: Options) {
  return async (map: mapboxgl.Map, lng: number, lat: number): Promise<number> => {
    // First try Mapbox GL’s built-in terrain query
    const e = map.queryTerrainElevation([lng, lat]);
    if (typeof e === "number" && Number.isFinite(e)) return e;

    // Fallback: decode from terrain-rgb tiles
    const fallback = await getElevationTerrainRgb(options, lng, lat);
    return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : 0;
  };
}
