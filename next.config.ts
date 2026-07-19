import type { NextConfig } from "next";
import { getBuildId } from "./lib/pwa/build-id";

const nextConfig: NextConfig = {
  images: {
    // Next 16 only honors qualities declared here — without this list every
    // quality={} prop in the app silently coerced back to 75, which is why
    // three image-optimization commits produced zero measured change (7/19).
    qualities: [65, 70, 75],
  },
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
