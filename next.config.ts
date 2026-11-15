import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // PGlite (the sandbox database, a development tool) is loaded by Node itself, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  experimental: {
    // Avoid restoring stale CSS after pulling changes (observed locally
    // with Tailwind/Turbopack). Development restarts compile from source.
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
