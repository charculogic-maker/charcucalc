import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@charculogic/fleisch-core"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
