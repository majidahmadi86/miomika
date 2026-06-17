import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordReferralAttribution } from "@/lib/referral/record-attribution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/home";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/home";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // New email signups: capture referral attribution before redirecting.
      if (type === "signup" && data.user?.id) {
        await recordReferralAttribution(
          data.user.id,
          request.cookies.get("mk_ref")?.value,
        );
        (await cookies()).set("mk_ref", "", { maxAge: 0, path: "/" });
      }
      // IMPORTANT: use next/navigation redirect (not NextResponse.redirect) so the
      // session cookies set by verifyOtp are flushed to the browser before redirecting.
      redirect(next);
    }
  }

  redirect(type === "recovery" ? "/reset" : "/login");
}
