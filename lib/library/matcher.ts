import type { LibraryResponse } from "./responses";
import { LIBRARY_TEMPLATES } from "./responses";

interface UserContext {
  archetype?: string;
  cefr_level?: string;
  wordsIntroduced?: string[];
}

export function matchLibrary(
  input: string,
  userContext?: UserContext
): LibraryResponse | null {
  const normalized = input.toLowerCase().trim();

  for (const template of LIBRARY_TEMPLATES) {
    // Check archetype match
    if (
      template.user_archetype !== "any" &&
      userContext?.archetype &&
      template.user_archetype !== userContext.archetype
    ) {
      continue;
    }

    // Test trigger patterns
    for (const pattern of template.trigger_patterns) {
      if (pattern.test(normalized)) {
        return template;
      }
    }
  }

  return null;
}

export function extractWordFromInput(input: string): string | null {
  // Pattern: "X แปลว่าอะไร" or "what does X mean"
  const patterns = [
    /(.+?)\s*แปลว่าอะไร/,
    /what does\s+(.+?)\s+mean/i,
    /ความหมายของ\s*(.+)/,
    /(.+?)\s*คืออะไร/,
    /(.+?)\s*ภาษาไทยว่า/,
    /(.+?)\s*ภาษาอังกฤษว่า/,
    /how do you say\s+(.+)/i,
    /พูด\s*(.+?)\s*ยังไง/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
