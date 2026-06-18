// scripts/fill-ipa.ts
// Deterministic en_ipa fill from CMUdict (static dict — no vendor, no LLM).
// DRY RUN by default (no writes). Pass --apply to write.
//   npm run fill:ipa            → dry run, reports coverage
//   npm run fill:ipa -- --apply → writes en_ipa for fillable rows
import { createServiceClient } from "../lib/supabase/service";

const CMUDICT_URL =
  "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";

const ARPA_IPA: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", B: "b", CH: "tʃ",
  D: "d", DH: "ð", EH: "ɛ", ER: "ɝ", EY: "eɪ", F: "f", G: "ɡ", HH: "h",
  IH: "ɪ", IY: "i", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ",
  OW: "oʊ", OY: "ɔɪ", P: "p", R: "ɹ", S: "s", SH: "ʃ", T: "t", TH: "θ",
  UH: "ʊ", UW: "u", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

const isBlank = (s: string | null | undefined): boolean => !s || !s.trim();

function arpaToIpa(phones: string[]): string {
  const vowelCount = phones.filter((p) => /\d$/.test(p)).length;
  let primary = -1, secondary = -1;
  const out = phones.map((p, i) => {
    const stress = p.match(/(\d)$/)?.[1];
    const base = p.replace(/\d$/, "");
    if (stress === "1") primary = i;
    else if (stress === "2") secondary = i;
    if (base === "AH" && stress === "0") return "ə";
    if (base === "ER" && stress === "0") return "ɚ";
    return ARPA_IPA[base] ?? "";
  });
  if (vowelCount > 1) {
    if (primary >= 0) out[primary] = "ˈ" + out[primary];
    if (secondary >= 0) out[secondary] = "ˌ" + out[secondary];
  }
  return out.join("");
}

async function loadCmudict(): Promise<Map<string, string[]>> {
  const res = await fetch(CMUDICT_URL);
  if (!res.ok) throw new Error(`CMUdict fetch failed: ${res.status}`);
  const text = await res.text();
  const map = new Map<string, string[]>();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;
    const noComment = line.split("#")[0].trim();
    if (!noComment) continue;
    const parts = noComment.split(/\s+/);
    const word = parts[0].replace(/\(\d+\)$/, "").toLowerCase();
    if (map.has(word)) continue; // keep first pronunciation
    map.set(word, parts.slice(1));
  }
  return map;
}

function lookupIpa(wordEn: string, dict: Map<string, string[]>): string | null {
  const tokens = wordEn.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const parts: string[] = [];
  for (const t of tokens) {
    const clean = t.replace(/[^a-z']/g, "");
    const phones = dict.get(clean);
    if (!phones) return null; // any token missing → not fillable
    parts.push(arpaToIpa(phones));
  }
  return `/${parts.join(" ")}/`;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const supabase = await createServiceClient();
  const dict = await loadCmudict();
  console.log(`CMUdict loaded: ${dict.size} words\n`);

  const { data, error } = await supabase
    .from("vocabulary_bank")
    .select("id,word_en,en_ipa")
    .limit(5000);
  if (error) { console.error("query failed:", error.message); process.exit(1); }

  const missing = (data ?? []).filter((r) => isBlank(r.en_ipa));
  const fills: { id: string; word_en: string; ipa: string }[] = [];
  const notFound: string[] = [];

  for (const r of missing) {
    const en = (r.word_en ?? "").trim();
    const ipa = en ? lookupIpa(en, dict) : null;
    if (ipa) fills.push({ id: r.id as string, word_en: en, ipa });
    else notFound.push(en || "(empty word_en)");
  }

  const pct = missing.length ? `${((fills.length / missing.length) * 100).toFixed(0)}%` : "0%";
  console.log(`rows missing en_ipa:   ${missing.length}`);
  console.log(`fillable from CMUdict: ${fills.length} (${pct})`);
  console.log(`not in dict (skip):    ${notFound.length}`);

  console.log(`\n── sample fills ──`);
  for (const f of fills.slice(0, 15)) console.log(`   ${f.word_en}  →  ${f.ipa}`);
  if (notFound.length) {
    console.log(`\n── not fillable (need review / non-English) ──`);
    for (const w of notFound.slice(0, 20)) console.log(`   ${w}`);
    if (notFound.length > 20) console.log(`   …and ${notFound.length - 20} more`);
  }

  if (!apply) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to write ${fills.length} fills.`);
    return;
  }

  let done = 0;
  for (const f of fills) {
    const { error: uErr } = await supabase
      .from("vocabulary_bank").update({ en_ipa: f.ipa }).eq("id", f.id);
    if (uErr) console.error(`  update failed ${f.word_en}: ${uErr.message}`);
    else done++;
  }
  console.log(`\nAPPLIED ${done} of ${fills.length} IPA fills.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
