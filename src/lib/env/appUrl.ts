// Absolute base URL for links that leave the app (emails, social preview images).
// Production sets NEXT_PUBLIC_APP_URL; Preview deployments leave it unset and use their
// own Vercel address, so their links never point at the live site.
export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
