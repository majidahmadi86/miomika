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
        // Baseline hardening on every response. No full CSP yet (Sentry,
        // Supabase, Stripe redirects, ONNX wasm all need an allowlist); only
        // frame-ancestors, so nobody can clickjack the app in an iframe.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
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
        source: "/push-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
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
