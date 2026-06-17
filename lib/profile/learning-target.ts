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
  // Respect an explicit, valid choice — INCLUDING improving the same language as
  // the UI (e.g. a confident English speaker polishing slang / native fluency).
  // We only PREDICT (the cross of the UI language) when nothing has been chosen.
  if (stored === "th" || stored === "en") return stored;
  return crossLanguage(ui);
}
