import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root; a stray lockfile in the user's home folder otherwise confuses Turbopack.
  turbopack: { root: __dirname },
};

export default nextConfig;
