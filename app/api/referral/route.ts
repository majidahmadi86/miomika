import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referral_credit_baht")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("referral_conversions")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", user.id);

  return NextResponse.json({
    code: profile?.referral_code ?? null,
    invitedCount: count ?? 0,
    creditBaht: profile?.referral_credit_baht ?? 0,
  });
}
