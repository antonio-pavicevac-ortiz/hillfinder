import { requireUser } from "@/lib/auth/requireUser";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="relative min-h-screen">{children}</div>;
}
