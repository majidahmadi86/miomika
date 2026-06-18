// Offline regression gate for romanization quality. Runs in predeploy.
import { isAcceptableGeneratedRomanization, isSyllabicPhrase } from "../lib/brain/romanization-guard";
let failed = 0;
const assert = (cond: boolean, msg: string) => { if (!cond) { console.error("✗ " + msg); failed++; } else console.log("✓ " + msg); };
assert(!isAcceptableGeneratedRomanization("phetmetmore", "เพิ่มเติม"), "run-on romanization for multi-syllable Thai rejected");
assert(isAcceptableGeneratedRomanization("perm-derm", "เพิ่มเติม"), "hyphen-segmented romanization passes");
assert(isAcceptableGeneratedRomanization("thai", "ไทย"), "single-syllable romanization passes");
assert(!isAcceptableGeneratedRomanization("เพิ่มเติม", "เพิ่มเติม"), "raw Thai fallback rejected");
assert(isSyllabicPhrase("khun chuay phom"), "real syllabic phrase passes");
assert(!isSyllabicPhrase("a b c d e"), "letter-by-letter phrase rejected");
if (failed) { console.error(`\n${failed} phonetics guard(s) failed`); process.exit(1); }
console.log("\nphonetics guards OK");
