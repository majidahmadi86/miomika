"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform/native";

/**
 * Dismisses the native splash screen the moment the web app has actually
 * PAINTED — replacing seconds of white page on cold app starts with a smooth
 * fade from Miomi's splash straight into the product. The config's 4.5s
 * launchShowDuration remains the failsafe (a network failure can never
 * strand the splash). No-op everywhere except inside the Capacitor shell.
 */
export function NativeSplashGate() {
  // True while the OAuth return is being replayed against /auth/callback —
  // covers the 1-2s where the old page (usually /login) would flash before
  // the signed-in navigation lands. A branded curtain instead of confusion.
  const [signingIn, setSigningIn] = useState(false);
  useEffect(() => {
    if (!isNativeApp()) return;
    // After Google OAuth returns via the App Link, the Custom Tab that hosted
    // it may linger behind the app — close it whenever the app resumes or a
    // deep link opens us. Best-effort on every count.
    try {
      const cap = (window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: { addListener?: (ev: string, cb: (data?: { url?: string }) => void) => void };
            Browser?: { close?: () => Promise<void> };
          };
        };
      }).Capacitor;
      const closeTab = () => { void cap?.Plugins?.Browser?.close?.().catch(() => {}); };
      cap?.Plugins?.App?.addListener?.("resume", () => closeTab());
      // THE OAUTH RETURN DOOR. Google finishes in the Custom Tab and
      // redirects to com.miomika.app://auth-callback?code=... — the OS hands
      // that URL here. Replaying it against /auth/callback INSIDE this
      // WebView is the whole point: the PKCE verifier cookie lives in the
      // app's jar, so the code exchange succeeds HERE and the session is
      // created in the app — never stranded in an outside browser again.
      cap?.Plugins?.App?.addListener?.("appUrlOpen", (data?: { url?: string; canGoBack?: boolean }) => {
        closeTab();
        const url = data?.url ?? "";
        if (url.startsWith("com.miomika.app://auth-callback")) {
          setSigningIn(true);
          const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          let next = "/home";
          try {
            next = localStorage.getItem("mk_native_next") || "/home";
            localStorage.removeItem("mk_native_next");
          } catch { /* best-effort */ }
          window.location.assign(`/auth/callback?${qs}${qs ? "&" : ""}next=${encodeURIComponent(next)}`);
        }
      });
      // A REAL APP'S BACK BUTTON: registering this listener takes over
      // Android's back press — go back in history when there is history,
      // minimize to the home screen when there is none. Without it the press
      // did nothing at the root and users felt trapped (Mike, 8/1).
      cap?.Plugins?.App?.addListener?.("backButton", (data?: { url?: string; canGoBack?: boolean }) => {
        const appApi = cap?.Plugins?.App as unknown as { minimizeApp?: () => Promise<void>; exitApp?: () => Promise<void> } | undefined;
        if (data?.canGoBack ?? window.history.length > 1) {
          window.history.back();
        } else {
          void appApi?.minimizeApp?.().catch(() => appApi?.exitApp?.());
        }
      });
      closeTab();
    } catch { /* best-effort */ }
    // Two animation frames = the first real paint is on screen.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const cap = (window as unknown as {
            Capacitor?: { Plugins?: { SplashScreen?: { hide?: (o?: { fadeOutDuration?: number }) => void } } };
          }).Capacitor;
          cap?.Plugins?.SplashScreen?.hide?.({ fadeOutDuration: 350 });
        } catch {
          /* plugin absent — the failsafe duration handles it */
        }
      });
    });
  }, []);
  if (!signingIn) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#FFFDF8" }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", border: "3px solid #C9E8DE", borderTopColor: "#34A98F", animation: "mkspin 0.9s linear infinite" }} />
      <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 15, fontWeight: 600, color: "#1F7A68", margin: 0 }}>Signing you in…</p>
      <p style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13, color: "#8A7E6C", margin: 0 }}>กำลังพาเข้าสู่ระบบค่ะ</p>
      <style>{`@keyframes mkspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
