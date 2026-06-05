import type { NextConfig } from "next";
import { getBuildId } from "./lib/pwa/build-id";

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: [] },
  env: {
    NEXT_PUBLIC_BUILD_ID: getBuildId(),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/version.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
