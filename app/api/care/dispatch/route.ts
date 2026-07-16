import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { composeCareEmail, composeCarePush } from "@/lib/care/moments";
import { sendCarePush, type PushRow } from "@/lib/care/push";

/**
 * Miomi's care-note dispatcher. Runs once a day via Vercel Cron (see
 * vercel.json, 04:30 UTC = 11:30 Bangkok, the lunch window) and sends at
 * most ONE warm email per eligible user per day.
 *
 * Respect rules, all enforced HERE so no caller can bypass them:
 * - care_emails_enabled must be true (one-click unsubscribe flips it off)
 * - never more than one note per day (care_notifications dedup)
 * - only users away 1..14 whole days; longer than that, Miomi lets go
 *   quietly rather than emailing forever
 * - auto-quiet: 3 unanswered notes since their last visit means Miomi
 *   noticed the silence and stops until they come back
 * - never on the day they visited; a care note is for the days between
 *
 * Auth: Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when the
 * CRON_SECRET env var is set. Anything else gets 401.
 */

export const maxDuration = 60;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "Miomi <miomi@miomika.com>";
const BATCH_CAP = 100;

function unsubscribeUrl(userId: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `https://miomika.com/api/care/unsubscribe?u=${encodeURIComponent(userId)}&sig=${sig}`;
}

/** Whole days between a timestamp and now, in Bangkok wall-clock days. */
function bangkokDaysAway(lastSeenIso: string): number {
  const DAY = 86_400_000;
  const BKK_OFFSET = 7 * 3_600_000;
  const nowDay = Math.floor((Date.now() + BKK_OFFSET) / DAY);
  const seenDay = Math.floor((new Date(lastSeenIso).getTime() + BKK_OFFSET) / DAY);
  return nowDay - seenDay;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const supabase = await createServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, ui_language, care_emails_enabled, last_seen_at")
    .eq("care_emails_enabled", true)
    .not("email", "is", null)
    .not("last_seen_at", "is", null)
    .limit(BATCH_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of profiles ?? []) {
    try {
      const daysAway = bangkokDaysAway(p.last_seen_at as string);
      if (daysAway < 1 || daysAway > 14) {
        skipped++;
        continue;
      }

      // One note per day, auto-quiet after 3 unanswered notes, and the
      // recent rows also feed the variety engine (no repeated variant,
      // prefer a different moment than the last two notes).
      const { data: recent } = await supabase
        .from("care_notifications")
        .select("sent_at, moment, variant")
        .eq("user_id", p.id)
        .order("sent_at", { ascending: false })
        .limit(6);
      const today = new Date().toISOString().slice(0, 10);
      const sentToday = (recent ?? []).some((r) => String(r.sent_at).slice(0, 10) === today);
      const unanswered = (recent ?? []).filter(
        (r) => new Date(String(r.sent_at)).getTime() > new Date(p.last_seen_at as string).getTime(),
      ).length;
      if (sentToday || unanswered >= 3) {
        skipped++;
        continue;
      }

      const excludeVariants = (recent ?? [])
        .map((r) => (r.variant ? String(r.variant) : null))
        .filter((v): v is string => Boolean(v));
      const recentMoments = (recent ?? [])
        .slice(0, 2)
        .map((r) => String(r.moment));

      // The moat moment: the newest thing Miomi remembers about them.
      let memoryFact: string | null = null;
      if (p.ui_language !== "th") {
        const { data: mem } = await supabase
          .from("user_memories")
          .select("content")
          .eq("user_id", p.id)
          .order("created_at", { ascending: false })
          .limit(1);
        memoryFact = mem?.[0]?.content ? String(mem[0].content) : null;
      }

      const lang = p.ui_language === "th" ? "th" : "en";

      // Word-recall moment: the word they most recently started learning,
      // joined to the bank for its pair + romanization. Best-effort.
      let recallWord: { en: string; th: string; roman: string | null } | null = null;
      const { data: vw } = await supabase
        .from("vocabulary_user_state")
        .select("word_en")
        .eq("user_id", p.id)
        .is("mastered_at", null)
        .order("last_introduced_at", { ascending: false })
        .limit(1);
      const recallEn = vw?.[0]?.word_en ? String(vw[0].word_en) : null;
      if (recallEn) {
        const { data: bank } = await supabase
          .from("vocabulary_bank")
          .select("word_en, word_th, th_romanization")
          .in("word_en", Array.from(new Set([recallEn, recallEn.toLowerCase()])))
          .limit(1);
        if (bank?.[0]?.word_th) {
          recallWord = {
            en: String(bank[0].word_en),
            th: String(bank[0].word_th),
            roman: bank[0].th_romanization ? String(bank[0].th_romanization) : null,
          };
        }
      }

      const careOpts = { lang: lang as "th" | "en", daysAway, memoryFact, recallWord, userSeed: String(p.id), excludeVariants, recentMoments };

      // Channel: push first when a device is subscribed (more intimate,
      // free); email otherwise. Never both, one ping is care, two is noise.
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", p.id);
      if (subs && subs.length > 0) {
        const push = composeCarePush(careOpts);
        let delivered = 0;
        for (const s of subs) {
          const r = await sendCarePush(s as PushRow, push);
          if (r.ok) delivered++;
          else if (r.gone) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
        if (delivered > 0) {
          await supabase
            .from("care_notifications")
            .insert({ user_id: p.id, moment: push.moment, variant: push.variantKey, channel: "push" });
          sent++;
          continue;
        }
      }

      const note = composeCareEmail(careOpts);
      const unsub = unsubscribeUrl(p.id as string);
      const html = note.html.replaceAll("%%UNSUB%%", unsub);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [p.email],
          subject: note.subject,
          html,
          headers: { "List-Unsubscribe": `<${unsub}>` },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        errors.push(`${String(p.id).slice(0, 8)}: resend ${res.status} ${body.slice(0, 120)}`);
        continue;
      }

      await supabase
        .from("care_notifications")
        .insert({ user_id: p.id, moment: note.moment, variant: note.variantKey, channel: "email" });
      sent++;
    } catch (err) {
      errors.push(`${String(p.id).slice(0, 8)}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
