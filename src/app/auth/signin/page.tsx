import { SignInPage as SignInPageComponent } from "@/components/auth/signin/SignInPage";
import { getProviders } from "next-auth/react";

export const metadata = {
  title: "Sign in to Hillfinder",
  description:
    "Access your Hillfinder account and explore nearby downhill routes tailored to your location.",
};

export default async function SignInPage() {
  const providers = await getProviders();
  return <SignInPageComponent providers={providers ?? {}} />;
}
