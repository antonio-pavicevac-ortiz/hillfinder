"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export default function SignInPage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Sign in to Hillfinder
      </h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="flex items-center justify-center gap-2 w-full btn-green text-white rounded-md py-2 font-medium"
      >
        <FcGoogle className="text-xl" />
        Continue with Google
      </button>
    </div>
  );
}
