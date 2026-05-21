"use client";

/**
 * AmbientCompanion — mounts the floating button + sheet/panel on every
 * authenticated route except /talk (where Miomi is already the canvas).
 *
 * Single import point so the (app) layout stays clean.
 */

import { usePathname } from "next/navigation";
import { CompanionButton } from "@/components/companion/CompanionButton";
import { CompanionSurface } from "@/components/companion/CompanionSurface";
import {
  CompanionProvider,
} from "@/components/companion/CompanionStateContext";

const HIDDEN_ROUTES = new Set<string>(["/talk"]);

export function AmbientCompanion() {
  const pathname = usePathname();
  if (HIDDEN_ROUTES.has(pathname)) {
    // /talk is already Miomi-the-canvas — no floating companion needed.
    return null;
  }
  return (
    <CompanionProvider>
      <CompanionButton />
      <CompanionSurface />
    </CompanionProvider>
  );
}
