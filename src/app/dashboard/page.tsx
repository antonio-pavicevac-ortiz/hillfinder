import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        id: (session.user as any).id ?? null,
      }}
    />
  );
}
