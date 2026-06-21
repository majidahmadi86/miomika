// SERVER ONLY — level-check test builder.
// Asks the model for a CEFR-spread of English meanings, then sends EACH through the
// accuracy gate (resolveOrGenerateWord) so every "correct answer" is a verified pair,
// never a hallucinated one. Distractors are sibling meanings from the same batch.
// Each question carries `concept` (the English meaning) so the UI can show an
// illustration for it — with a graceful fallback until the art pipeline lands.
import { callGroqJson, resolveOrGenerateWord } from "@/lib/brain/word-content";

export type TestQuestion = {
  show: string; // the target-language word the learner sees
  romanization?: string; // pronunciation support (Thai target only)
  options: string[]; // 4 meanings in the learner's UI language, shuffled
  correctIndex: number;
  level: string; // CEFR level of this item
  concept: string; // English concept → drives the illustration slot
};

type WordAsk = { en: string; level: string };
type Verified = {
  show: string;
  meaning: string;
  romanization?: string;
  level: string;
  concept: string;
};

// Climbing spread — easiest to hardest. Total = 10.
const SPREAD: ReadonlyArray<{ level: string; n: number }> = [
  { level: "A1", n: 3 },
  { level: "A2", n: 3 },
  { level: "B1", n: 2 },
  { level: "B2", n: 2 },
];

const LADDER = ["A1", "A2", "B1", "B2", "C1"] as const;

function parseJsonArray<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
}

function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function buildWordAskSystem(targetName: string): string {
  return `You are a CEFR vocabulary expert for learners of ${targetName}. Reply STRICT JSON ONLY — no prose, no markdown fences — an ARRAY of objects {"en": ONE common English word-meaning (lowercase, a single concept, no romanization) of a ${targetName} word a learner typically knows at the given CEFR level, "level": the CEFR level string}. Choose vocabulary TYPICAL of each level — A1 basic concrete everyday, A2 common, B1 abstract or situational, B2 precise/nuanced/less frequent. All distinct, no duplicates. JSON array only.`;
}

// Small sequential-chunk mapper — keeps LLM concurrency low (free-tier RPM).
async function mapChunked<T, R>(
  items: T[],
  size: number,
  fn: (it: T) => Promise<R | null>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const res = await Promise.all(chunk.map((it) => fn(it).catch(() => null)));
    for (const r of res) if (r) out.push(r);
  }
  return out;
}

export async function buildLevelCheck(args: {
  learningTarget: "th" | "en";
  targetName: string;
}): Promise<{ questions: TestQuestion[] }> {
  const { learningTarget, targetName } = args;
  const total = SPREAD.reduce((n, s) => n + s.n, 0);
  const asks = SPREAD.map((s) => `${s.n} at ${s.level}`).join(", ");
  const user = `Give exactly ${total} words, climbing in difficulty: ${asks}.`;

  const list = parseJsonArray<WordAsk>(
    await callGroqJson(buildWordAskSystem(targetName), user),
  );
  if (!list || list.length < 4) return { questions: [] };

  const verified = await mapChunked<WordAsk, Verified>(
    list.filter((it) => it && typeof it.en === "string" && it.en.trim()),
    4,
    async (it) => {
      const r = await resolveOrGenerateWord({
        word: it.en.trim(),
        learningTarget,
        cefrLevel: (it.level ?? "A1").toString().toUpperCase(),
      });
      if (!r) return null;
      const show = learningTarget === "th" ? r.word_th : r.word_en;
      const meaning = learningTarget === "th" ? r.word_en : r.word_th;
      if (!show || !meaning) return null;
      return {
        show,
        meaning,
        level: (it.level ?? r.cefr_level ?? "A1").toString().toUpperCase(),
        concept: r.word_en,
        ...(learningTarget === "th" && r.th_romanization
          ? { romanization: r.th_romanization }
          : {}),
      };
    },
  );

  // Need distinct shown words and at least 4 to make real multiple-choice.
  const seen = new Set<string>();
  const items = verified.filter((v) => {
    const k = v.show.toLowerCase();
    if (seen.has(k) || !v.meaning.trim()) return false;
    seen.add(k);
    return true;
  });
  if (items.length < 4) return { questions: [] };

  const meanings = items.map((v) => v.meaning);
  const questions: TestQuestion[] = items.map((v, i) => {
    const distractors = shuffle(
      meanings.filter((m, j) => j !== i && m !== v.meaning),
    ).slice(0, 3);
    const options = shuffle([v.meaning, ...distractors]);
    return {
      show: v.show,
      options,
      correctIndex: options.indexOf(v.meaning),
      level: v.level,
      concept: v.concept,
      ...(v.romanization ? { romanization: v.romanization } : {}),
    };
  });

  questions.sort(
    (a, b) =>
      (LADDER as readonly string[]).indexOf(a.level) -
      (LADDER as readonly string[]).indexOf(b.level),
  );
  return { questions };
}
