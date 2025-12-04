import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function requireUser() {
  // 1. Attempt to load the user's session from the server
  const session = await getServerSession(authOptions);

  // 2. If there's no session (meaning no logged-in user),
  //    immediately redirect them to the login page.
  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  // 3. If we reach this point, the user *is* logged in.
  //    So we return the user object for use in your page.
  return session.user;
}
