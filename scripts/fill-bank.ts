// Loops the deployed grow route until the wordlist is fully saved. Needs only
// GROW_TOKEN (+ optional GROW_URL) in .env.local — no Vertex/Supabase env. Run: npm run fill:bank
const URL_BASE = process.env.GROW_URL || "https://miomika.com/api/admin/grow";
const TOKEN = process.env.GROW_TOKEN;
async function main() {
  if (!TOKEN) { console.error("Set GROW_TOKEN in .env.local"); process.exit(1); }
  let total = 0;
  for (let i = 0; i < 100; i++) {
    const res = await fetch(`${URL_BASE}?token=${encodeURIComponent(TOKEN)}`);
    const j = await res.json() as { added?: number; remaining?: number; withheld?: number; errors?: string[] };
    total += j.added ?? 0;
    console.log(`call ${i+1}: +${j.added ?? 0}  (remaining ${j.remaining ?? "?"}, withheld ${j.withheld ?? 0})`);
    if (j.errors?.length) console.error("  errors:", j.errors.slice(0,3));
    if ((j.remaining ?? 0) <= 0) break;
    if ((j.added ?? 0) === 0) { console.log("  no progress this call — stopping."); break; }
  }
  console.log(`\nDONE — added ${total} words.`);
}
main().catch(e => { console.error(e); process.exit(1); });
