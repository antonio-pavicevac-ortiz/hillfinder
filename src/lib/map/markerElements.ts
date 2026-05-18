export function createCircleEl(color: string) {
  const el = document.createElement("div");
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.backgroundColor = color;
  el.style.borderRadius = "50%";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  el.style.touchAction = "none";
  return el;
}

export async function reverseGeocodeName(lng: number, lat: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return "Dropped Pin";

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data?.features?.[0]?.place_name ?? "Dropped Pin";
  } catch {
    return "Dropped Pin";
  }
}
