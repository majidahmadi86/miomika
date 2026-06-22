import type { ServerProfile } from "@/lib/auth/get-server-profile";
import { deriveBond } from "@/lib/companion/bond-core";

/**
 * Memory Moments — the awareness block injected into Miomi's system prompt.
 * Phase 1 facts (name/target/streak) + closeness stage + durable facts she's learned.
 * TRUE facts only, never invented; framed to weave in gently, never as a list. "" for guests.
 */
export function buildMemoryContext(profile: ServerProfile | null, memories: string[] = []): string {
  if (!profile) return "";

  const facts: string[] = [];

  const name = profile.display_name?.trim();
  if (name) facts.push(`Their name is ${name}. Use it naturally once in a while — never every line.`);

  const target = profile.learning_target_language === "en" ? "English" : "Thai";
  facts.push(`They're learning ${target} with you.`);

  if (profile.streak >= 2) {
    facts.push(`They've come back ${profile.streak} days in a row — you've quietly noticed how they keep showing up, and it warms you.`);
  }

  const bond = deriveBond(profile.bond_points ?? 0);
  if (bond.hearts >= 1) {
    const stage = profile.ui_language === "th" ? bond.label.th : bond.label.en;
    facts.push(`Your closeness so far: "${stage}", ${bond.hearts} heart${bond.hearts === 1 ? "" : "s"} earned together — you can feel the bond growing.`);
  }

  const recalled = memories.map((m) => m.trim()).filter(Boolean).slice(0, 8);

  if (facts.length === 0 && recalled.length === 0) return "";

  let block =
    `\n\nWHAT YOU ALREADY KNOW ABOUT THEM (these are TRUE — reference them like a friend who pays attention, not a database: weave in at most ONE when it genuinely fits the moment, never list them, never force them, never invent anything beyond this):\n` +
    facts.map((f) => `- ${f}`).join("\n");

  if (recalled.length) {
    block +=
      `\n\nTHINGS THEY'VE TOLD YOU BEFORE (recall ONE gently and specifically only when the moment invites it — it should feel like "oh, you mentioned…", warm and natural; never a checklist, never out of nowhere, never more than one at a time):\n` +
      recalled.map((m) => `- ${m}`).join("\n");
  }

  block += `\nLet a memory or fact surface only when it lands warmly, as a response to what they're saying now — never OPEN by reciting one ("I was just thinking about…"); that feels performed. If nothing fits, just be present with them. Knowing them quietly is enough — you don't have to prove it.`;
  return block;
}
