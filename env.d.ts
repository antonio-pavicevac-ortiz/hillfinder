// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL?: string;
    MONGODB_URI: string;
    MONGODB_DB?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
}
