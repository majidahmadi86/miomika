import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // IMPORTANT: use next/navigation redirect (not NextResponse.redirect) so the
      // session cookies set by verifyOtp are flushed to the browser before redirecting.
      redirect(next);
    }
  }

  redirect(type === "recovery" ? "/reset" : "/login");
}
