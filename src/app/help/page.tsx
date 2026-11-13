// src/app/help/page.tsx
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import HelpPage from "@/components/dashboard/help/HelpPage";
import { getServerSession } from "next-auth";

// Public, so a link from social media or search shows the page instead of a sign-in screen
export const metadata = {
  title: "How to use Hillfinder",
  description:
    "Plan downhill routes for skating and cycling, start anywhere with a long press, and ride hands-free with your phone locked.",
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  return <HelpPage signedIn={!!session?.user} />;
}
