"use client";

import { useMemo } from "react";
import { useGuidanceStore } from "@/lib/guidance/store";
import type { GuidanceMoment } from "@/lib/guidance/types";
import { useUILanguage } from "@/lib/i18n/client";
import { home } from "@/lib/voice/warmth";

export interface HomeWhisper {
  text: string;
  href: string;
}

function routeFromMoment(moment: GuidanceMoment): string {
  const { kind, payload } = moment.next_action;
  if (kind === "navigate" && typeof payload?.to === "string") return payload.to;
  if (kind === "open_sheet") return "/talk";
  if (kind === "open_signup") return "/signup";
  if (kind === "continue") return "/dashboard";
  return "/talk";
}

/** Maps the global guidance moment to a /home whisper card, or null (Path A silence). */
export function useHomeWhisper(): HomeWhisper | null {
  const moment = useGuidanceStore((s) => s.currentMoment);
  const lang = useUILanguage();

  return useMemo(() => {
    if (!moment) return null;

    switch (moment.trigger) {
      case "idle_in_app":
      case "feature_not_discovered":
      case "returning_after_absence":
        return { text: home.whisper.dayOne(lang), href: routeFromMoment(moment) };
      case "first_word_mastered":
        return { text: home.whisper.reviewsDue(3, lang), href: "/dashboard" };
      default:
        return null;
    }
  }, [moment, lang]);
}

/** Read current guidance moment (alias requested in spec). */
export function useGuidance(): GuidanceMoment | null {
  return useGuidanceStore((s) => s.currentMoment);
}
