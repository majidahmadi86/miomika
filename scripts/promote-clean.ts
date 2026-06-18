// scripts/promote-clean.ts
// Deterministic verify: stamp verified_at on structurally-sound rows.
// Gate: clean romanization + has en_ipa + word_en latin + word_th Thai.
// DRY RUN by default. Pass --apply to write verified_at = now().
import { createServiceClient } from "../lib/supabase/service";
import { isAcceptableBankRomanization } from "../lib/brain/romanization-guard";

const THAI = /[\u0E00-\u0E7F]/;
const hasThai = (s: string | null | undefined): boolean => !!s && THAI.test(s);
const isBlank = (s: string | null | undefined): boolean => !s || !s.trim();

type Row = {
  id: string; word_en: string | null; word_th: string | null;
  th_romanization: string | null; en_ipa: string | null; verified_at: string | null;
};

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("vocabulary_bank")
    .select("id,word_en,word_th,th_romanization,en_ipa,verified_at")
    .limit(5000);
  if (error) { console.error("query failed:", error.message); process.exit(1); }
  const rows = (data ?? []) as Row[];

  let already = 0;
  const promote: string[] = [];
  const fail = { no_ipa: 0, rom: 0, thai_in_en: 0, bad_th: 0 }; // non-exclusive

  for (const r of rows) {
    if (r.verified_at) { already++; continue; }
    const en = (r.word_en ?? "").trim();
    const th = (r.word_th ?? "").trim();
    let ok = true;
    if (isBlank(r.en_ipa)) { fail.no_ipa++; ok = false; }
    if (isBlank(r.th_romanization) ||
        !isAcceptableBankRomanization(r.th_romanization as string, th)) { fail.rom++; ok = false; }
    if (hasThai(en)) { fail.thai_in_en++; ok = false; }
    if (th === "" || !hasThai(th)) { fail.bad_th++; ok = false; }
    if (ok) promote.push(r.id);
  }

  const heldBack = rows.length - already - promote.length;
  const after = already + promote.length;
  const pct = (n: number): string => `${((n / rows.length) * 100).toFixed(0)}%`;

  console.log(`\n total rows:           ${rows.length}`);
  console.log(` already verified:     ${already} (${pct(already)})`);
  console.log(` PROMOTABLE (clean):   ${promote.length}`);
  console.log(` held back:            ${heldBack}`);
  console.log(`\n held-back reasons (non-exclusive — a row can fail several):`);
  console.log(`   missing en_ipa:     ${fail.no_ipa}   ← includes valid Thai-direction words to verify in a later pass`);
  console.log(`   romanization issue: ${fail.rom}`);
  console.log(`   Thai in EN column:  ${fail.thai_in_en}`);
  console.log(`   bad Thai column:    ${fail.bad_th}`);
  console.log(`\n after apply: ${after}/${rows.length} verified (${pct(after)})`);

  if (!apply) { console.log(`\nDRY RUN — nothing written. Re-run with --apply.`); return; }

  const now = new Date().toISOString();
  let done = 0;
  for (let i = 0; i < promote.length; i += 100) {
    const chunk = promote.slice(i, i + 100);
    const { error: uErr } = await supabase
      .from("vocabulary_bank").update({ verified_at: now }).in("id", chunk);
    if (uErr) console.error(`  chunk ${i} failed: ${uErr.message}`);
    else done += chunk.length;
  }
  console.log(`\nAPPLIED verified_at to ${done} of ${promote.length} rows.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
