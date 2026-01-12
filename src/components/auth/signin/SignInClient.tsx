"use client";

import dynamic from "next/dynamic";

const SignInPageComponent = dynamic(
  () => import("@/components/auth/signin/SignInPage").then((m) => m.SignInPage),
  { ssr: false }
);

export default function SignInClient({ providers }: { providers: Record<string, any> }) {
  return <SignInPageComponent providers={providers} />;
}
