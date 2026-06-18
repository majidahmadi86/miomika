export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { callGeminiJson, generateWordCard } from "@/lib/brain/word-content";
import { resolvePhonetics } from "@/lib/brain/phonetics";
import { WORDLIST } from "@/lib/grow/wordlist";

const CMUDICT_URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";
const ARPA_IPA: Record<string, string> = { AA:"ɑ",AE:"æ",AH:"ʌ",AO:"ɔ",AW:"aʊ",AY:"aɪ",B:"b",CH:"tʃ",D:"d",DH:"ð",EH:"ɛ",ER:"ɝ",EY:"eɪ",F:"f",G:"ɡ",HH:"h",IH:"ɪ",IY:"i",JH:"dʒ",K:"k",L:"l",M:"m",N:"n",NG:"ŋ",OW:"oʊ",OY:"ɔɪ",P:"p",R:"ɹ",S:"s",SH:"ʃ",T:"t",TH:"θ",UH:"ʊ",UW:"u",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ" };
function arpaToIpa(p: string[]): string { const v=p.filter(x=>/\d$/.test(x)).length; let a=-1,b=-1; const o=p.map((x,i)=>{const s=x.match(/(\d)$/)?.[1];const c=x.replace(/\d$/,"");if(s==="1")a=i;else if(s==="2")b=i;if(c==="AH"&&s==="0")return"ə";if(c==="ER"&&s==="0")return"ɚ";return ARPA_IPA[c]??"";}); if(v>1){if(a>=0)o[a]="ˈ"+o[a];if(b>=0)o[b]="ˌ"+o[b];} return o.join(""); }
async function loadCmudict(): Promise<Map<string,string[]>> { const r=await fetch(CMUDICT_URL); const t=await r.text(); const m=new Map<string,string[]>(); for(const ln of t.split("\n")){if(!ln||ln.startsWith(";;;"))continue;const nc=ln.split("#")[0].trim();if(!nc)continue;const ps=nc.split(/\s+/);const w=ps[0].replace(/\(\d+\)$/,"").toLowerCase();if(!m.has(w))m.set(w,ps.slice(1));} return m; }
function lookupIpa(w: string, d: Map<string,string[]>): string|null { const ts=w.toLowerCase().trim().split(/\s+/).filter(Boolean); if(!ts.length)return null; const ps:string[]=[]; for(const t of ts){const ph=d.get(t.replace(/[^a-z']/g,""));if(!ph)return null;ps.push(arpaToIpa(ph));} return `/${ps.join(" ")}/`; }
const THAI_PURE = /^[\u0E00-\u0E7F0-9\s.,!?'"()\u2018\u2019\u201C\u201D\-\u2013\u2014:;%฿\u2026]+$/;
function isPureThai(t: string): boolean { const s=t.trim(); return THAI_PURE.test(s) && /[\u0E00-\u0E7F]/.test(s); }
const NOTE_BLANK = ["use_when","do_not_use_when","cultural_warning","miomi_pronunciation_tip","example_context","emoji","subtopic","th_tone_pattern","audio_key_th","audio_key_en","gender_marker","age_group","image_category","prerequisite_words","related_words"];

export async function GET(req: NextRequest) {
  const provided = req.headers.get("x-grow-key");
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const okKey = !!provided && ((svcKey && provided === svcKey) || (process.env.GROW_TOKEN && provided === process.env.GROW_TOKEN));
  if (!okKey) {
    const profile = await getServerProfile();
    const admins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const email = profile?.email?.toLowerCase() ?? null;
    if (!email || !admins.includes(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const started = Date.now();
  const supabase = await createServiceClient();
  const dict = await loadCmudict();
  const { data: tmplRows } = await supabase.from("vocabulary_bank").select("*").eq("status","active").not("politeness_level","is",null).limit(1);
  const template = (tmplRows?.[0] ?? {}) as Record<string, unknown>;
  const { data: existing } = await supabase.from("vocabulary_bank").select("word_en, word_th").limit(5000);
  const haveEn = new Set((existing??[]).map(r=>(r.word_en??"").trim().toLowerCase()).filter(Boolean));
  const haveTh = new Set((existing??[]).map(r=>(r.word_th??"").trim()).filter(Boolean));

  const pending = WORDLIST.filter(s => !haveEn.has(s.en.toLowerCase()));
  let added=0, withheld=0, dup=0; const rejected:string[]=[]; const errors:string[]=[]; const cards:unknown[]=[];

  for (let i=0; i<pending.length; i+=4) {
    if (Date.now()-started > 45000) break;
    await Promise.all(pending.slice(i,i+4).map(async (seed) => {
      if (haveEn.has(seed.en.toLowerCase())) { dup++; return; }
      const card = await generateWordCard(seed.en, "th", seed.level);
      if (!card) { withheld++; return; }
      if (!isPureThai(card.word_th)) { rejected.push(`${card.word_en} → ${card.word_th}`); return; }
      if (haveEn.has(card.word_en.toLowerCase()) || haveTh.has(card.word_th)) { dup++; return; }
      haveEn.add(card.word_en.toLowerCase()); haveTh.add(card.word_th);
      const exTh = card.example_th && isPureThai(card.example_th) ? card.example_th : null;
      const phon = await resolvePhonetics({ word_th: card.word_th, word_en: card.word_en, learningTarget:"th", bankRomanization:null, bankIpa:null });
      const rom = phon.th_romanization ?? null;
      const ipa = lookupIpa(card.word_en, dict);
      let defEn = "", defTh = "";
      try {
        const dr = await callGeminiJson(`Define the English word/phrase simply for a learner, in BOTH languages. STRICT JSON only: {"def_en":"<one short English sentence>","def_th":"<one short Thai sentence in Thai script>"}. No fences.`, `word: ${card.word_en} (Thai: ${card.word_th})`);
        const dj = JSON.parse((dr||"{}").replace(/```json|```/g,"").trim());
        defEn = typeof dj.def_en==="string" ? dj.def_en : "";
        defTh = (typeof dj.def_th==="string" && isPureThai(dj.def_th)) ? dj.def_th : "";
      } catch { /* best-effort */ }
      cards.push({ level: seed.level, word_en: card.word_en, word_th: card.word_th, romanization: rom, en_ipa: ipa, def_en: defEn, def_th: defTh, example_th: exTh });
      const base: Record<string, unknown> = { ...template };
      for (const k of Object.keys(base)) if (["id","created_at","updated_at"].includes(k) || /vector|tsv|fts|search/i.test(k)) delete base[k];
      for (const k of NOTE_BLANK) if (k in base) base[k] = Array.isArray(base[k]) ? [] : "";
      const { error } = await supabase.from("vocabulary_bank").insert({
        ...base,
        word_en: card.word_en, word_th: card.word_th,
        example_en: exTh ? card.example_en : "", example_th: exTh ?? "",
        th_romanization: rom, en_ipa: ipa,
        miomi_note_en: defEn, miomi_note_th: defTh,
        topic: seed.topic, cefr_level: seed.level,
        status: "active", verified_at: new Date().toISOString(),
        teach_thai_to_english: true, teach_english_to_thai: true,
      });
      if (error) errors.push(`${card.word_en}: ${error.message}`);
      else added++;
    }));
  }
  const remaining = WORDLIST.filter(s => !haveEn.has(s.en.toLowerCase())).length;
  return NextResponse.json({ added, withheld, rejected, dup, remaining, errors, cards });
}
