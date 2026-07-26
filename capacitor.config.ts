import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Miomika mobile shell — the app is a native window onto the LIVE site.
 * Every Vercel deploy updates the app instantly; there is no second codebase.
 */
const config: CapacitorConfig = {
  appId: "com.mikarostudio.miomika",
  appName: "Miomika",
  webDir: "mobile/www",
  server: {
    url: "https://miomika.com",
    cleartext: false,
  },
  backgroundColor: "#FFFDF8",
  android: {
    allowMixedContent: false,
  },
};

export default config;
