import User from "@/models/User";
import crypto from "crypto";
import mongoose from "mongoose";

// A signed-in user connects Google from Settings: the server sets this short-lived cookie,
// then the browser goes through Google sign-in. The signIn callback links the Google
// account only if the cookie is valid and the same user is still signed in.
export const GOOGLE_LINK_COOKIE = "hf-google-link";
export const GOOGLE_LINK_MAX_AGE_SECONDS = 10 * 60;

export type GoogleLinkError = "GoogleAccountInUse" | "GoogleAlreadyConnected" | "GoogleLinkFailed";

function sign(payload: string) {
  return crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "")
    .update(`google-link:${payload}`)
    .digest("base64url");
}

export function createGoogleLinkIntent(userId: string) {
  const payload = `${userId}.${Date.now() + GOOGLE_LINK_MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the user id the intent was issued to, or null if it's missing, forged, or expired
export function readGoogleLinkIntent(value: string | undefined): string | null {
  if (!value || !process.env.NEXTAUTH_SECRET) return null;
  const [userId, expires, signature] = value.split(".");
  if (!userId || !expires || !signature) return null;

  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  if (!(Number(expires) > Date.now())) return null;

  return mongoose.isValidObjectId(userId) ? userId : null;
}

export async function linkGoogleAccount(
  userId: string,
  googleId: string
): Promise<{ ok: true } | { ok: false; error: GoogleLinkError }> {
  const owner = await User.findOne({ googleId }).select("_id").lean<{ _id: unknown }>();
  if (owner) {
    // Linking the same Google account twice is harmless
    return String(owner._id) === userId ? { ok: true } : { ok: false, error: "GoogleAccountInUse" };
  }

  try {
    // Never replace a different Google account that's already connected
    const { matchedCount } = await User.updateOne(
      { _id: userId, $or: [{ googleId: { $exists: false } }, { googleId: null }] },
      { $set: { googleId } }
    );
    if (matchedCount === 1) return { ok: true };

    const exists = await User.exists({ _id: userId });
    return { ok: false, error: exists ? "GoogleAlreadyConnected" : "GoogleLinkFailed" };
  } catch (err) {
    // Another account claimed this Google id between the check and the update
    if ((err as { code?: number }).code === 11000) return { ok: false, error: "GoogleAccountInUse" };
    throw err;
  }
}
