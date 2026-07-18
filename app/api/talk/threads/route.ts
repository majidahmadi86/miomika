import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

export const dynamic = "force-dynamic";

/** List the member's chat threads, newest activity first. Guests get []. */
export async function GET() {
  try {
    const profile = await getServerProfile();
    if (!profile) return NextResponse.json({ threads: [] });
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("talk_threads")
      .select("id, title, last_message_at, created_at")
      .eq("user_id", profile.id)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ threads: data ?? [] });
  } catch (error) {
    logError("talk_threads", "list failed", error);
    return NextResponse.json({ threads: [] });
  }
}

/** Create a new chat thread (the "New chat" action). */
export async function POST() {
  try {
    const profile = await getServerProfile();
    if (!profile) return NextResponse.json({ error: "auth" }, { status: 401 });
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("talk_threads")
      .insert({ user_id: profile.id })
      .select("id, title, last_message_at, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ thread: data });
  } catch (error) {
    logError("talk_threads", "create failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
