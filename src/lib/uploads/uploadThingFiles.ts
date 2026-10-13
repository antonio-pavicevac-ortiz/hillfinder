// UploadThing file URLs look like https://utfs.io/f/<key> or https://<app>.ufs.sh/f/<key>
export function uploadThingKey(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const { protocol, hostname, pathname } = new URL(url);
    if (protocol !== "https:") return null;
    if (hostname !== "utfs.io" && !hostname.endsWith(".ufs.sh")) return null;
    const match = pathname.match(/^\/f\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
