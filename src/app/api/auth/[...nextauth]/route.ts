export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise, { getDb } from "@/lib/mongo";
import { compare } from "bcryptjs";
function getUserId(u: unknown): string | undefined {
  if (u && typeof u === "object" && "id" in u) {
    const id = (u as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}
const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "hillfinder" }),
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const db = await getDb();
        const user = await db.collection("users").findOne({ email });

        // If the user exists but has no local password (e.g., created via Google OAuth)
        if (!user?.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name || undefined,
        };
      },
    }),
  ],

  // With env.d.ts present, this is fine:
  secret: process.env.NEXTAUTH_SECRET as string,
  // If you prefer, use: secret: process.env.NEXTAUTH_SECRET as string,

  callbacks: {
    async jwt({ token, user }) {
      const id = getUserId(user);
      if (id) token.id = id; // `token.id` exists thanks to your next-auth.d.ts augmentation
      return token;
    },

    async session({ session, token }) {
      if (typeof token.id === "string") {
        // Avoids casting: rebuild user object with an id
        session.user = { ...(session.user ?? {}), id: token.id };
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export { authOptions };
