// scripts/fill-bank.ts
// Loops the deployed grow route until the wordlist is fully saved.
// Reads GROW_TOKEN (+ optional GROW_URL) from .env.local itself — no dotenv dependency,
// no Vertex/Supabase env needed. Run: npm run fill:bank
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = v;
      }
    } catch { /* file missing is fine */ }
  }
}
loadEnvLocal();

const URL_BASE = process.env.GROW_URL || "https://miomika.com/api/admin/grow";
const TOKEN = process.env.GROW_TOKEN;

async function main() {
  if (!TOKEN) {
    console.error("GROW_TOKEN not found. Add a line to .env.local:  GROW_TOKEN=your-long-random-string");
    console.error("(and set the SAME value in Vercel env, then redeploy, so the route accepts it.)");
    process.exit(1);
  }
  let total = 0;
  for (let i = 0; i < 100; i++) {
    const res = await fetch(`${URL_BASE}?token=${encodeURIComponent(TOKEN)}`);
    const j = (await res.json().catch(() => ({}))) as {
      added?: number; remaining?: number; withheld?: number; dup?: number;
      errors?: string[]; error?: unknown;
    };
    if (!res.ok || j?.error) {
      console.error(`Route returned ${res.status}:`, j?.error ?? j);
      console.error("→ Is GROW_TOKEN set in Vercel AND redeployed, matching .env.local exactly?");
      process.exit(1);
    }
    total += j.added ?? 0;
    console.log(`call ${i + 1}: +${j.added ?? 0}  (remaining ${j.remaining ?? "?"}, withheld ${j.withheld ?? 0}, dup ${j.dup ?? 0})`);
    if (j.errors?.length) console.error("  errors:", j.errors.slice(0, 3));
    if ((j.remaining ?? 0) <= 0) break;
    if ((j.added ?? 0) === 0) { console.log("  no new words added this call — stopping."); break; }
  }
  console.log(`\nDONE — added ${total} words.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
