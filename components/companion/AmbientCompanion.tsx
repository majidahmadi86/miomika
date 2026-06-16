"use client";

/**
 * AmbientCompanion — mounts the floating button + sheet + panel on every
 * authenticated route except /talk. With the Zustand-backed store, the
 * provider is now a no-op shim kept for API compatibility.
 *
 * Sheet and Panel each gate themselves on viewport (mobile vs desktop) so
 * they're mutually exclusive — see MIOMIKA.md §8 Phase 2 (Block A3).
 */

import { usePathname } from "next/navigation";
import { CompanionButton } from "@/components/companion/CompanionButton";
import { CompanionSheet } from "@/components/companion/CompanionSheet";
import { CompanionPanel } from "@/components/companion/CompanionPanel";

const HIDDEN_ROUTES = new Set<string>(["/talk", "/me"]);

export function AmbientCompanion() {
  const pathname = usePathname();
  if (HIDDEN_ROUTES.has(pathname)) {
    return null;
  }
  // On /home Miomi is already the centerpiece + the Talk CTA goes to /talk,
  // so the floating button is a redundant second cat. Keep sheet/panel mounted
  // (mobile Home still opens the sheet); just hide the button.
  const hideButton = pathname === "/home";
  return (
    <>
      {!hideButton && <CompanionButton />}
      <CompanionSheet />
      <CompanionPanel />
    </>
  );
}
