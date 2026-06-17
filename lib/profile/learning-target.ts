/**
 * Learning-target resolution — the single source of truth.
 *
 * `learning_target_language` has no DB default and is written only when a user
 * explicitly taps the "I'm learning" toggle, so most accounts hold NULL. In a
 * Thai↔English product the target is, by definition, the *other* language from
 * the UI — so we derive the cross language whenever there is no explicit, valid,
 * different choice (NULL, or a nonsensical same-as-UI value). Every profile
 * reader funnels through this, so Home, Talk, Learn, and the Dashboard can
 * never disagree again.
 */
export type LearningLang = "th" | "en";

export function crossLanguage(ui: string | null | undefined): LearningLang {
  return ui === "en" ? "th" : "en";
}

export function resolveLearningTarget(
  stored: string | null | undefined,
  ui: string | null | undefined,
): LearningLang {
  const uiLang: LearningLang = ui === "en" ? "en" : "th";
  const cross: LearningLang = uiLang === "en" ? "th" : "en";
  return (stored === "th" || stored === "en") && stored !== uiLang ? stored : cross;
}
