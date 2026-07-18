import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

export const dynamic = "force-dynamic";

/** Messages of one thread the member owns, oldest first (Mike's multi-thread
 * spec: returning to a thread = the conversation simply continues). */
export async function GET(req: Request) {
  try {
    const profile = await getServerProfile();
    if (!profile) return NextResponse.json({ items: [] });
    const url = new URL(req.url);
    const thread = url.searchParams.get("thread");
    if (!thread) return NextResponse.json({ items: [] });
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("role, content, created_at, language, session_id, exchange_number, thread_id, user_id")
      .eq("user_id", profile.id)
      .eq("thread_id", thread)
      .not("content", "like", "[kickoff]%")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const items = (data ?? []).reverse().map((r) => ({
      role: r.role,
      content: r.content,
      created_at: r.created_at,
      language: r.language,
      session_id: r.session_id,
      exchange_number: r.exchange_number,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    logError("talk_history", "failed to load thread history", error);
    return NextResponse.json({ items: [] });
  }
}
