import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Prevent Turbopack from using ~/package-lock.json as workspace root.
    // Point to the monorepo root (event-ticket-system), not the home dir.
    root: path.join(__dirname, "../.."),
  },
  // Force Next.js bundler to process phosphor icons so SSR uses the ESM build
  // (190KB tree-shakeable) instead of the CJS barrel (4.8MB) — fixes malloc OOM.
  transpilePackages: ["@phosphor-icons/react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
