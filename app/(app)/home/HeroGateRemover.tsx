"use client";

import { useEffect } from "react";

/**
 * Fades out the server-painted hero the moment the real app mounts.
 *
 * THE ROOT OF THE "PLEASE REFRESH" BUG (7/19-7/26): this used to call
 * el.remove() — deleting a node REACT RENDERED AND OWNS. React never forgets
 * its children: on the next route change it reached for the hero to reconcile,
 * found it gone, and threw "NotFoundError: removeChild ... not a child of this
 * node" — persistently, on web and in the Capacitor app, since the LCP commit
 * shipped. The law: NEVER remove React-rendered nodes with raw DOM calls.
 * Fade it, hide it, leave the node in place — React stays whole, the LCP win
 * stays too (a display:none div costs nothing after first paint).
 */
export function HeroGateRemover() {
  useEffect(() => {
    const el = document.getElementById("mio-ssr-hero");
    if (!el) return;
    el.style.pointerEvents = "none";
    el.style.opacity = "0";
    const t = window.setTimeout(() => {
      el.style.display = "none";
    }, 500);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
