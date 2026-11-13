// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the Next.js "N" badge in development; it sits over the map controls on phones
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // The help page moved out of the dashboard so anyone can read it
  async redirects() {
    return [{ source: "/dashboard/help", destination: "/help", permanent: true }];
  },
  // experimental: { serverActions: {} }, // not needed in Next 15
};

export default nextConfig;
