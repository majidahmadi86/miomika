import { NextResponse } from "next/server";
import { getAdminProfile } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("admin_reminders")
    .select("id, title, kind, due_date, note, done, created_at")
    .eq("done", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ready: false, error: error.message, reminders: [] });
  }
  return NextResponse.json({ ready: true, reminders: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    op?: string;
    id?: string;
    title?: string;
    due_date?: string | null;
    note?: string | null;
    kind?: string;
  } | null;

  if (!body?.op) return NextResponse.json({ error: "missing op" }, { status: 400 });

  const supabase = await createServiceClient();

  if (body.op === "create") {
    const title = (body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const { data, error } = await supabase
      .from("admin_reminders")
      .insert({
        title,
        kind: body.kind ?? "renewal",
        due_date: body.due_date || null,
        note: body.note?.trim() || null,
      })
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (body.op === "done") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("admin_reminders").update({ done: true }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === "delete") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("admin_reminders").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown op" }, { status: 400 });
}
