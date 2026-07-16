/**
 * Output language guard: the last line of defense against garbage replies.
 *
 * Miomi speaks Thai and English, plus Latin romanization. A sane reply is
 * made of Thai script, Latin script, digits, and punctuation. This guard
 * catches the failure classes models actually produce:
 *   - mojibake (replacement chars, control bytes)
 *   - language flips / foreign-script floods (reply drowning in CJK,
 *     Cyrillic, Arabic, ... scripts she never speaks)
 *   - degenerate repetition (the same token or substring looping)
 *
 * It deliberately does NOT try to judge semantic quality (false-but-valid
 * Thai is the Gemini-first routing's job, not a regex's), and it tolerates
 * a FEW foreign characters so "the Japanese word for cat" answers still
 * pass. The router treats a guard failure exactly like a provider error:
 * the next engine is the silent retry, the library failover the warm net.
 */

const THAI = /\p{Script=Thai}/u;
const LATIN = /\p{Script=Latin}/u;
const ANY_LETTER = /\p{L}/u;

export function isSaneReply(text: string): { ok: boolean; reason?: string } {
  const t = text.trim();
  if (t.length === 0) return { ok: false, reason: "empty" };

  // Mojibake: replacement character or stray control bytes (tab/newline fine).
  if (t.includes("\uFFFD")) return { ok: false, reason: "mojibake" };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(t)) {
    return { ok: false, reason: "control_chars" };
  }

  // Foreign-script flood: count letters; if a meaningful share is neither
  // Thai nor Latin, the reply flipped into a language she doesn't speak.
  let letters = 0;
  let foreign = 0;
  for (const ch of t) {
    if (!ANY_LETTER.test(ch)) continue;
    letters++;
    if (!THAI.test(ch) && !LATIN.test(ch)) foreign++;
  }
  if (letters >= 8 && foreign / letters > 0.3) {
    return { ok: false, reason: "foreign_script" };
  }

  // Degenerate repetition, two forms:
  // (a) token loops for spaced text ("yes yes yes yes yes yes ...")
  const tokens = t.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (tokens.length >= 6) {
    const counts = new Map<string, number>();
    for (const tok of tokens) counts.set(tok, (counts.get(tok) ?? 0) + 1);
    if (Math.max(...counts.values()) / tokens.length > 0.6) {
      return { ok: false, reason: "token_repetition" };
    }
  }
  // (b) consecutive substring loops, which also catches unspaced Thai
  //     ("ค่ะค่ะค่ะค่ะค่ะค่ะ..." or any 3-10 char unit repeated 6+ times).
  if (/(.{3,10})\1{5,}/u.test(t)) {
    return { ok: false, reason: "substring_repetition" };
  }

  return { ok: true };
}
