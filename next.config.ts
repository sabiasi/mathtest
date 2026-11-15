import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // PGlite (the sandbox database, a development tool) is loaded by Node itself, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  // PDF and Word export on Vercel: the packaged Chromium (lib/server/chrome.ts) is a set of
  // compressed files that the code only finds while running, so the build is told to ship them.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/docx": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
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
