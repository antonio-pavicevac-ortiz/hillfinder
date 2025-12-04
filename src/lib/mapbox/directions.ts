export async function getDrivingRoutes(origin: [number, number], destination: [number, number]) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&alternatives=true&overview=full&steps=true&access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes) throw new Error("No routes returned");

  return data.routes;
}
