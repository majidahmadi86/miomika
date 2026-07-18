import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/debug/log";

export const dynamic = "force-dynamic";

/** Rename a thread the member owns. Body: { title: string } */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getServerProfile();
    if (!profile) return NextResponse.json({ error: "auth" }, { status: 401 });
    const { id } = await ctx.params;
    const body = (await req.json()) as { title?: string };
    const title = (body.title ?? "").trim().slice(0, 60);
    if (!title) return NextResponse.json({ error: "empty" }, { status: 400 });
    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("talk_threads")
      .update({ title })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("talk_threads", "rename failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** Soft-delete a thread the member owns (rows keep feeding brain memory). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getServerProfile();
    if (!profile) return NextResponse.json({ error: "auth" }, { status: 401 });
    const { id } = await ctx.params;
    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("talk_threads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("talk_threads", "delete failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
