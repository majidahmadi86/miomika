"use client";

/**
 * ProBadge — small gold star badge shown on Pro-locked features.
 * Position: absolute top-right of the parent container.
 *
 * MIOMIKA.md §8 Phase 3A (Block H1).
 */

import { Sparkles } from "lucide-react";

interface ProBadgeProps {
  size?: "sm" | "md";
}

export function ProBadge({ size = "sm" }: ProBadgeProps) {
  const px = size === "sm" ? 12 : 16;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "2px 6px",
        background: "#FFF8F2",
        border: "1px solid #E8D5BD",
        borderRadius: "999px",
        position: "absolute",
        top: "8px",
        right: "8px",
        pointerEvents: "none",
      }}
    >
      <Sparkles
        size={px}
        strokeWidth={2}
        color="#C9A96E"
        aria-hidden
      />
      <span
        style={{
          fontSize: "9px",
          fontWeight: 600,
          color: "#9A8B73",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontFamily: "'Quicksand', sans-serif",
          lineHeight: 1,
        }}
      >
        Pro
      </span>
    </div>
  );
}

/**
 * Hook that triggers a Guidance moment when a Pro-locked feature is tapped.
 * Call `showProGate(featureKey)` in the feature's onClick handler.
 */
export function useProGate() {
  function showProGate(_featureKey = "this") {
    // Lazy import to avoid circular deps at module level
    import("@/lib/guidance/store").then(({ useGuidanceStore }) => {
      useGuidanceStore.getState().setMoment({
        trigger: "feature_pro_locked" as import("@/lib/guidance/types").GuidanceTrigger,
        miomi_says_th: `ฟีเจอร์นี้สำหรับ Pro Miomi ค่า~ อยากปลดล็อกไหมคะ?`,
        miomi_says_en: `This is a Pro Miomi feature — want to unlock it?`,
        next_action: {
          label_th: "ดู Pro Miomi",
          label_en: "See Pro Miomi",
          kind: "open_pricing" as import("@/lib/guidance/types").NextActionKind,
        },
        miomi_state: "happy",
        dismissible: true,
        priority: "soft",
        id: `pro_${Date.now()}`,
        created_at: Date.now(),
      });
    }).catch(() => {});
  }

  return { showProGate };
}
