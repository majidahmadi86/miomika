// scripts/audit-banks.ts
// READ-ONLY quality audit of vocabulary_bank + phrases_bank. No writes.
// Run: npm run audit:banks  (with project Supabase env loaded)
import { createServiceClient } from "../lib/supabase/service";
import { isAcceptableBankRomanization } from "../lib/brain/romanization-guard";

const THAI = /[\u0E00-\u0E7F]/;
const hasThai = (s: string | null | undefined): boolean => !!s && THAI.test(s);
const isBlank = (s: string | null | undefined): boolean => !s || !s.trim();
const isSentence = (s: string | null | undefined): boolean =>
  !!s && s.trim().split(/\s+/).length >= 3;
const pctOf = (n: number, t: number): string => (t === 0 ? "0%" : `${((n / t) * 100).toFixed(0)}%`);

type Vocab = {
  word_en: string | null; word_th: string | null;
  th_romanization: string | null; en_ipa: string | null;
  example_th: string | null; example_en: string | null; verified_at: string | null;
};
type Phrase = {
  phrase_en: string | null; phrase_th: string | null;
  th_romanization: string | null;
};

function section(title: string, lines: string[]): void {
  if (lines.length === 0) return;
  console.log(`\n── ${title} (${lines.length}) ──`);
  for (const l of lines.slice(0, 20)) console.log(`   ${l}`);
  if (lines.length > 20) console.log(`   …and ${lines.length - 20} more`);
}

async function main(): Promise<void> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("vocabulary_bank")
    .select("word_en,word_th,th_romanization,en_ipa,example_th,example_en,verified_at")
    .limit(5000);
  if (error) { console.error("vocabulary_bank query failed:", error.message); process.exit(1); }
  const vocab = (data ?? []) as Vocab[];
  const total = vocab.length;

  const noIpa: string[] = [], noRom: string[] = [], badRom: string[] = [];
  const thaiInEn: string[] = [], nonThaiInTh: string[] = [];
  const noExTh: string[] = [], noExEn: string[] = [], badExEn: string[] = [];
  const byThai = new Map<string, Set<string>>();
  let verified = 0;

  for (const r of vocab) {
    const en = (r.word_en ?? "").trim();
    const th = (r.word_th ?? "").trim();
    const tag = `${en} / ${th}`;
    if (r.verified_at) verified++;
    if (isBlank(r.en_ipa)) noIpa.push(tag);
    if (isBlank(r.th_romanization)) noRom.push(tag);
    else if (!isAcceptableBankRomanization(r.th_romanization as string, th))
      badRom.push(`${tag}  →  "${r.th_romanization}"`);
    if (hasThai(en)) thaiInEn.push(tag);
    if (th !== "" && !hasThai(th)) nonThaiInTh.push(tag);
    if (isBlank(r.example_th)) noExTh.push(tag);
    if (isBlank(r.example_en)) noExEn.push(tag);
    else if (!isSentence(r.example_en)) badExEn.push(`${tag}  →  "${r.example_en}"`);
    if (th !== "") {
      let set = byThai.get(th);
      if (!set) { set = new Set(); byThai.set(th, set); }
      if (en !== "") set.add(en);
    }
  }

  const dupThai = [...byThai.entries()].filter(([, e]) => e.size > 1)
    .map(([th, e]) => `${th}  ←  ${[...e].join(", ")}`);
  const review = new Set<string>([...badRom, ...thaiInEn, ...nonThaiInTh, ...badExEn]);

  console.log(`\n════════ vocabulary_bank — ${total} rows ════════`);
  console.log(`verified_at set:           ${verified} (${pctOf(verified, total)})`);
  console.log(`\n── auto-fixable (deterministic) ──`);
  console.log(`missing en_ipa:            ${noIpa.length} (${pctOf(noIpa.length, total)})  → fill from CMUdict`);
  console.log(`missing th_romanization:   ${noRom.length}`);
  console.log(`\n── needs human review ──`);
  console.log(`garbled th_romanization:   ${badRom.length}  (format only; semantic errors need eyeballing)`);
  console.log(`Thai text in EN column:    ${thaiInEn.length}`);
  console.log(`non-Thai in TH column:     ${nonThaiInTh.length}`);
  console.log(`missing example_th:        ${noExTh.length}`);
  console.log(`missing example_en:        ${noExEn.length}`);
  console.log(`suspicious example_en:     ${badExEn.length}`);
  console.log(`duplicate Thai → many EN:  ${dupThai.length}`);
  console.log(`\n>>> ROWS NEEDING HUMAN REVIEW: ${review.size} of ${total} (${pctOf(review.size, total)})`);

  section("garbled th_romanization", badRom);
  section("Thai in English column", thaiInEn);
  section("non-Thai in Thai column", nonThaiInTh);
  section("suspicious example_en", badExEn);
  section("duplicate Thai → multiple EN", dupThai);

  const { data: pData, error: pErr } = await supabase
    .from("phrases_bank")
    .select("phrase_en,phrase_th,th_romanization")
    .limit(5000);
  if (pErr) { console.error("\nphrases_bank query failed:", pErr.message); process.exit(1); }
  const phrases = (pData ?? []) as Phrase[];
  console.log(`\n════════ phrases_bank — ${phrases.length} rows ════════`);
  console.log(`missing th_romanization:${phrases.filter((p) => isBlank(p.th_romanization)).length}`);
  console.log(`note: ZERO app readers today — taught phrases are 100% LLM.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
