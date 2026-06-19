import type { ServerProfile } from "@/lib/auth/get-server-profile";

/**
 * Memory Moments — Phase 1 (no DB).
 * Turns durable facts we already hold about a signed-in user into a short awareness
 * block Miomi can reference warmly — so "she remembers you" is real, not just a tagline.
 * TRUE facts only, never invented. Returns "" for guests.
 * Phase 2 will extend this with learned facts (user_memories table) + closeness stage.
 */
export function buildMemoryContext(profile: ServerProfile | null): string {
  if (!profile) return "";

  const facts: string[] = [];

  const name = profile.display_name?.trim();
  if (name) {
    facts.push(`Their name is ${name}. Use it naturally once in a while — never every line.`);
  }

  const target = profile.learning_target_language === "en" ? "English" : "Thai";
  facts.push(`They're learning ${target} with you.`);

  if (profile.streak >= 2) {
    facts.push(`They've come back ${profile.streak} days in a row — you've quietly noticed how they keep showing up, and it warms you.`);
  }

  if (facts.length === 0) return "";

  return (
    `\n\nWHAT YOU ALREADY KNOW ABOUT THEM (TRUE facts — reference them like a friend who pays attention, not a database: weave in at most ONE when it genuinely fits the moment, never list them, never force them, never invent anything beyond this):\n` +
    facts.map((f) => `- ${f}`).join("\n") +
    `\nLet a fact surface only when it lands warmly${profile.streak >= 2 ? ` — e.g. a soft note that you've had ${profile.streak} days together now, in whatever language you're speaking` : ""}. If nothing fits, just be present with them. Knowing them quietly is enough — you don't have to prove it.`
  );
}
