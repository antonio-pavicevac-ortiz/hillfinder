// Decode the RGB → elevation (Mapbox Terrain-RGB formula)
function decodeElevation(r: number, g: number, b: number) {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

export async function getElevation(lat: number, lng: number) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const z = 14; // zoom for decent precision
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      Math.pow(2, z)
  );

  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=${token}`;

  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);

  const pixel = ctx.getImageData(bitmap.width / 2, bitmap.height / 2, 1, 1).data;

  return decodeElevation(pixel[0], pixel[1], pixel[2]); // meters
}
