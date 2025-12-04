import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SignInPage as SignInPageComponent } from "@/components/auth/signin/SignInPage";
import { getServerSession } from "next-auth";
import { getProviders } from "next-auth/react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign in to Hillfinder",
  description:
    "Access your Hillfinder account and explore nearby downhill routes tailored to your location.",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const providers = await getProviders();
  return <SignInPageComponent providers={providers ?? {}} />;
}
