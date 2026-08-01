"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/platform/native";

/**
 * Dismisses the native splash screen the moment the web app has actually
 * PAINTED — replacing seconds of white page on cold app starts with a smooth
 * fade from Miomi's splash straight into the product. The config's 4.5s
 * launchShowDuration remains the failsafe (a network failure can never
 * strand the splash). No-op everywhere except inside the Capacitor shell.
 */
export function NativeSplashGate() {
  useEffect(() => {
    if (!isNativeApp()) return;
    // After Google OAuth returns via the App Link, the Custom Tab that hosted
    // it may linger behind the app — close it whenever the app resumes or a
    // deep link opens us. Best-effort on every count.
    try {
      const cap = (window as unknown as {
        Capacitor?: { Plugins?: { App?: { addListener?: (ev: string, cb: () => void) => void }; Browser?: { close?: () => Promise<void> } } };
      }).Capacitor;
      const closeTab = () => { void cap?.Plugins?.Browser?.close?.().catch(() => {}); };
      cap?.Plugins?.App?.addListener?.("resume", closeTab);
      cap?.Plugins?.App?.addListener?.("appUrlOpen", closeTab);
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
  return null;
}
