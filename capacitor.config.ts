import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Miomika mobile shell — the app is a native window onto the LIVE site.
 * Every Vercel deploy updates the app instantly; there is no second codebase.
 */
const config: CapacitorConfig = {
  appId: "com.miomika.app",
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
  plugins: {
    SplashScreen: {
      // The remote site needs 2-4s to first paint on a cold LTE start. A
      // splash that auto-hides early = seconds of WHITE PAGE (Thai users
      // leave). The splash now holds up to 4.5s as a failsafe, and the web
      // app dismisses it EARLIER the moment it has painted (NativeSplashGate)
      // — so users always see Miomi, never a blank screen, and a network
      // failure can never strand the splash forever.
      launchShowDuration: 4500,
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: "#7FD8C3",
    },
  },
};

export default config;
