import { findOrCreateGoogleUser } from "@/lib/auth/googleAccount";
import { connectToDB } from "@/lib/mongodb";
import AccountDeletion, { SESSION_MAX_AGE_SECONDS, hashEmail } from "@/models/AccountDeletion";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { Account, Profile, Session } from "next-auth";
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

const INVALID_CREDENTIALS = "Invalid email or password";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" as const, maxAge: SESSION_MAX_AGE_SECONDS },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          throw new Error(INVALID_CREDENTIALS);
        }

        const normalizedEmail = email.trim().toLowerCase();
        const windowMs = 15 * 60 * 1000;
        if (
          !rateLimit(`signin:ip:${clientIp(req?.headers)}`, 20, windowMs) ||
          !rateLimit(`signin:email:${normalizedEmail}`, 10, windowMs)
        ) {
          throw new Error("Too many sign-in attempts. Try again in a few minutes.");
        }

        await connectToDB();

        const user = await User.findOne({ email: normalizedEmail });
        // Same message either way so sign-in doesn't reveal which emails have accounts
        if (!user?.password) throw new Error(INVALID_CREDENTIALS);

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error(INVALID_CREDENTIALS);

        // 🔥 FIX: Return a serializable plain object (NOT the Mongoose document)
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? null,
        };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },

  callbacks: {
    // Every Google sign-in gets (or reuses) a local account, matched by Google account id
    async signIn({ account, profile }: { account: Account | null; profile?: Profile }) {
      if (account?.provider !== "google") return true;

      await connectToDB();
      const result = await findOrCreateGoogleUser({
        googleId: account.providerAccountId,
        email: profile?.email,
        emailVerified: (profile as { email_verified?: boolean } | undefined)?.email_verified,
        name: profile?.name,
        image: (profile as { picture?: string } | undefined)?.picture,
      });

      return result.ok ? true : `/auth/signin?error=${result.error}`;
    },

    async jwt({ token, user, account }: { token: JWT; user?: any; account?: Account | null }) {
      if (user) {
        token.id = user.id;
        token.image = user.image ?? token.image;

        // Google's user.id is its own account id; use the local account's id and email
        if (account?.provider === "google") {
          await connectToDB();
          const local = await User.findOne({ googleId: account.providerAccountId })
            .select("_id email image")
            .lean<{ _id: unknown; email: string; image?: string | null }>();
          if (!local) throw new Error("Google account has no local account");
          token.id = String(local._id);
          token.email = local.email;
          token.image = local.image ?? token.image;
        }

        // `iat` is re-stamped on every refresh, so record when this sign-in happened
        token.signedInAt = Date.now();
        return token;
      }

      // Reject tokens issued before the account was deleted, including ones on other devices.
      // Throwing makes NextAuth clear the session cookie and return no session.
      if (token.email) {
        await connectToDB();
        const deletion = await AccountDeletion.findOne({ emailHash: hashEmail(token.email) })
          .select("deletedAt")
          .lean<{ deletedAt: Date }>();
        const signedInAt = typeof token.signedInAt === "number" ? token.signedInAt : 0;
        if (deletion && signedInAt <= deletion.deletedAt.getTime()) {
          throw new Error("Session revoked: account was deleted");
        }
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
