import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { requireUser } from "@/lib/auth/requireUser";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="relative min-h-screen">
      {/* Frosted Header */}
      <div
        className="
    fixed top-0 left-0 right-0 z-[80]
    bg-white/20
    backdrop-blur-3xl
    border-b border-white/30
    shadow-[0_8px_30px_rgba(0,0,0,0.12)]
    supports-[backdrop-filter]:bg-white/10
  "
      >
        <div className="mx-auto max-w-7xl px-6">
          <DashboardHeader user={user} />
        </div>
      </div>

      {/* Dashboard content */}
      {children}
    </div>
  );
}
