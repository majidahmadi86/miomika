"use client";

/**
 * Backward-compat shim. The Phase-1 CompanionProvider/useCompanion API now
 * forwards to the Zustand store in lib/companion/store.ts. New code should
 * import `useCompanionStore` directly from `@/lib/companion/store` instead
 * of `useCompanion` from this file.
 *
 * The provider is a no-op wrapper that exists only so existing AmbientCompanion
 * mounting sites compile without changes.
 */

import { useCompanionStore } from "@/lib/companion/store";
import type { CompanionStateLegacy } from "@/lib/companion/types";
import { toLegacyState } from "@/lib/companion/types";

export type CompanionState = CompanionStateLegacy;

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useCompanion() {
  const state = useCompanionStore((s) => toLegacyState(s.state));
  const isOpen = useCompanionStore((s) => s.isOpen);
  const hasUnread = useCompanionStore((s) => s.hasUnread);
  const open = useCompanionStore((s) => s.open);
  const close = useCompanionStore((s) => s.close);
  const setUnread = useCompanionStore((s) => s.setUnread);
  const requestState = useCompanionStore((s) => s.requestState);

  return {
    state,
    isOpen,
    hasUnread,
    setUnread,
    open,
    close,
    requestState: (next: CompanionState) => requestState(next),
  };
}
