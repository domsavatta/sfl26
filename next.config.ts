import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['require-in-the-middle'],
  // Dev server only: let phones/tablets on the local network load the dev
  // scripts (e.g. http://192.168.x.x:3000). Without this, Next.js blocks them
  // and the page never hydrates.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;
