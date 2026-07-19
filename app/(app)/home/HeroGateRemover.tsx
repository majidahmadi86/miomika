"use client";

import { useEffect } from "react";

/** Fades out the server-painted hero the moment the real app mounts. */
export function HeroGateRemover() {
  useEffect(() => {
    const el = document.getElementById("mio-ssr-hero");
    if (!el) return;
    el.style.opacity = "0";
    const t = window.setTimeout(() => el.remove(), 500);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
