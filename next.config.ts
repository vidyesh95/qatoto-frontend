import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  // reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    // OAuth avatar hosts — next/image throws on remote src not listed here.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google
      { protocol: "https", hostname: "avatars.githubusercontent.com" }, // GitHub
    ],
  },
};

export default nextConfig;
