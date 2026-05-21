"use client";

/**
 * useMediaQuery — SSR-safe match-media hook built on useSyncExternalStore.
 *
 * Returns the server snapshot (`false`) during SSR and the live snapshot on
 * the client. No setState-in-effect, no hydration mismatch.
 */

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
}

function getSnapshot(query: string) {
  return () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), getSnapshot(query), getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

// ─── useHasMounted ──────────────────────────────────────────────────────────
//
// Canonical SSR-safe "am I on the client yet?" without setState-in-effect.
// Components that gated themselves on a `mounted` boolean should use this
// instead.

function subscribeMounted() {
  return () => {};
}
function getSnapshotMounted(): boolean {
  return true;
}
function getServerSnapshotMounted(): boolean {
  return false;
}

export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeMounted,
    getSnapshotMounted,
    getServerSnapshotMounted,
  );
}
