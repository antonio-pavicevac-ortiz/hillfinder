import SignInClient from "@/components/auth/signin/SignInClient";
import { getProviders } from "next-auth/react";

export const metadata = {
  title: "Sign in to Hillfinder",
  description:
    "Access your Hillfinder account and explore nearby downhill routes tailored to your location.",
};

export default async function SignInPage() {
  const providers = await getProviders();
  return <SignInClient providers={providers ?? {}} />;
}
