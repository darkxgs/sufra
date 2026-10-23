import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  poweredByHeader: false,
  // PGlite (the embedded Postgres used locally and in tests) loads its WASM
  // from disk at runtime, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@electric-sql/pglite/dist/pglite.wasm",
      "./node_modules/@electric-sql/pglite/dist/pglite.data",
      "./node_modules/@electric-sql/pglite/dist/initdb.wasm",
    ],
  },
  partialPrefetching: true,
  experimental: {
    // One 404 page for the whole app: the root layout sits under [lang].
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Menu photos never change under the same name.
        source: "/photos/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
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
