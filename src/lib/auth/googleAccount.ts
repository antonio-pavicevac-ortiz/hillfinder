import User from "@/models/User";

export type GoogleIdentity = {
  googleId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
};

export type GoogleAccountResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: "GoogleEmailUnverified" | "GoogleEmailInUse" };

// Case-insensitive match, since older accounts may have been stored with mixed-case emails
const EMAIL_COLLATION = { locale: "en", strength: 2 };

// Find the local account for a Google sign-in, creating one on first sign-in.
// Accounts are matched only by Google's account id. An existing account with the same
// email is never linked automatically: the sign-in is refused instead.
export async function findOrCreateGoogleUser(
  identity: GoogleIdentity
): Promise<GoogleAccountResult> {
  const existing = await User.findOne({ googleId: identity.googleId })
    .select("_id email")
    .lean<{ _id: unknown; email: string }>();
  if (existing) return { ok: true, userId: String(existing._id), email: existing.email };

  const email = identity.email?.trim().toLowerCase();
  if (!email || identity.emailVerified !== true) {
    return { ok: false, error: "GoogleEmailUnverified" };
  }

  const emailOwner = await User.findOne({ email })
    .collation(EMAIL_COLLATION)
    .select("_id email googleId")
    .lean<{ _id: unknown; email: string; googleId?: string }>();
  if (emailOwner) {
    // A concurrent first sign-in for this same Google account may have just created it
    if (emailOwner.googleId === identity.googleId) {
      return { ok: true, userId: String(emailOwner._id), email: emailOwner.email };
    }
    return { ok: false, error: "GoogleEmailInUse" };
  }

  try {
    const created = await User.create({
      name: identity.name ?? "",
      email,
      image: identity.image ?? null,
      googleId: identity.googleId,
      authProvider: "google",
    });
    return { ok: true, userId: String(created._id), email };
  } catch (err) {
    // Another request created the account first: reuse it only if it's this Google account
    if ((err as { code?: number }).code === 11000) {
      const raced = await User.findOne({ googleId: identity.googleId })
        .select("_id email")
        .lean<{ _id: unknown; email: string }>();
      if (raced) return { ok: true, userId: String(raced._id), email: raced.email };
      return { ok: false, error: "GoogleEmailInUse" };
    }
    throw err;
  }
}
