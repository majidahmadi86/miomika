import { NextResponse } from "next/server";
import { getAdminProfile } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";
import { REFERRAL_REWARD_BAHT } from "@/lib/billing/tiers";
import { logError } from "@/lib/debug/log";

export const runtime = "nodejs";

const TIERS = ["free", "pro", "pro_max"];

/**
 * POST { userId, action, value? }
 * action in: set_tier | grant_room_credits | grant_referral_credit | reward_referral | add_note
 * Admin grants update the balance + write an audit row (the credit ledgers are reserved for
 * system events — purchase/consume/refund, referral_earned/spent — so admin grants live in the
 * audit log, which is the record of who changed what). reward_referral replays the webhook earn.
 */
export async function POST(req: Request) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { userId?: string; action?: string; value?: string | number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const userId = body.userId;
  const action = body.action;
  if (!userId || !action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, tier, room_credits, referral_credit_baht")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  let detail = "";
  try {
    switch (action) {
      case "set_tier": {
        const tier = String(body.value);
        if (!TIERS.includes(tier)) return NextResponse.json({ error: "bad_tier" }, { status: 400 });
        await supabase.from("profiles").update({ tier }).eq("id", userId);
        detail = `tier set to ${tier} (was ${target.tier ?? "?"})`;
        break;
      }
      case "grant_room_credits": {
        const n = Math.trunc(Number(body.value));
        if (!Number.isFinite(n) || n === 0) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
        const next = Math.max(0, (target.room_credits ?? 0) + n);
        await supabase.from("profiles").update({ room_credits: next }).eq("id", userId);
        detail = `room credits ${n > 0 ? "+" : ""}${n} (now ${next})`;
        break;
      }
      case "grant_referral_credit": {
        const n = Math.trunc(Number(body.value));
        if (!Number.isFinite(n) || n === 0) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
        const next = Math.max(0, (target.referral_credit_baht ?? 0) + n);
        await supabase.from("profiles").update({ referral_credit_baht: next }).eq("id", userId);
        detail = `referral credit ${n > 0 ? "+" : ""}${n} baht (now ${next})`;
        break;
      }
      case "reward_referral": {
        // Replay the webhook earn: flip a pending conversion for this referred user, grant both.
        const { data: conv } = await supabase
          .from("referral_conversions")
          .update({ rewarded: true, rewarded_at: new Date().toISOString() })
          .eq("referred_id", userId)
          .eq("rewarded", false)
          .select("referrer_id, referred_id")
          .maybeSingle();
        if (!conv) return NextResponse.json({ error: "no_pending_referral" }, { status: 400 });
        const ref = `admin-reward:${conv.referred_id}`;
        for (const uid of [conv.referrer_id, conv.referred_id]) {
          const { data: p } = await supabase.from("profiles").select("referral_credit_baht").eq("id", uid).maybeSingle();
          const next = (p?.referral_credit_baht ?? 0) + REFERRAL_REWARD_BAHT;
          await supabase.from("profiles").update({ referral_credit_baht: next }).eq("id", uid);
          await supabase.from("credit_ledger").insert({ user_id: uid, delta: REFERRAL_REWARD_BAHT, reason: "referral_earned", ref });
        }
        detail = `rewarded referral: +${REFERRAL_REWARD_BAHT} baht to referrer + referred`;
        break;
      }
      case "add_note": {
        const note = String(body.value ?? "").trim().slice(0, 1000);
        if (!note) return NextResponse.json({ error: "empty_note" }, { status: 400 });
        detail = `note: ${note}`;
        break;
      }
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (e) {
    logError("admin_user_action", "action failed", e, { action, userId });
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    admin_email: admin.email ?? null,
    action,
    target_user_id: userId,
    detail,
  });

  return NextResponse.json({ ok: true, detail });
}
