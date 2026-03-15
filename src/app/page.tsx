import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export const metadata = {
  title: "Hillfinder — Find your next downhill ride",
  description:
    "Hillfinder helps cyclists, skateboarders, and explorers find smooth, scenic rides — and save or share them with friends.",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-hillfinder-gradient px-6 text-center">
      <style>{`
        @keyframes hillfinder-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center">
        <div className="relative mb-6 flex h-[280px] w-full items-center justify-center sm:h-[320px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl sm:h-[220px] sm:w-[220px]" />

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-[260px] -translate-y-1/2 sm:block">
            <Image
              src="/favicon.svg"
              alt=""
              width={190}
              height={190}
              className="rotate-[-8deg] opacity-20 blur-[3px]"
              priority
            />
          </div>

          <div className="relative z-10">
            <Image
              src="/favicon.svg"
              alt="Hillfinder logo"
              width={220}
              height={220}
              priority
              className="drop-shadow-[0_16px_32px_rgba(15,53,88,0.22)]"
              style={{ animation: "hillfinder-float 6s ease-in-out infinite" }}
            />
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-y-1/2 translate-x-[100px] sm:block">
            <Image
              src="/favicon.svg"
              alt=""
              width={170}
              height={170}
              className="rotate-[8deg] opacity-20 blur-[3px]"
              priority
            />
          </div>
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight leading-[1.05] text-slate-800 sm:text-6xl">
          Discover the best downhill routes around&nbsp;you.
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          Hillfinder helps cyclists, skateboarders, and explorers find smooth, scenic rides — and
          save or share them with friends.
        </p>

        <div className="mt-5 mb-10 flex gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signin"
            className="rounded-xl border border-brandGreen px-6 py-3 font-medium text-brandGreen transition hover:bg-white/40"
          >
            Sign In
          </Link>

          <Link
            href="/auth/signup"
            className="rounded-xl bg-brandGreen px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brandGreen-dark"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
