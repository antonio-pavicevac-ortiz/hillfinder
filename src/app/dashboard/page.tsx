import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Dashboard from "@/components/dashboard/Dashboard";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/signin");
  }

  return <Dashboard user={session.user} />;
}
