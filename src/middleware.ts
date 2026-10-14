import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // getToken can throw on a malformed Authorization header; treat that as signed out
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  }).catch(() => null);

  const pathname = request.nextUrl.pathname;

  // Block auth pages for logged-in users, and send them past the landing page without
  // waiting on a server render (the dashboard still verifies the session itself)
  if (token && (pathname === "/" || pathname.startsWith("/auth"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Block dashboard for logged-out users
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/auth/:path*"],
};
