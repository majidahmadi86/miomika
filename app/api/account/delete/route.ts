import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = user.id;
  const admin = await createServiceClient();

  // FK-safe: tables referencing profiles first, then tables referencing auth.users, then profiles, then auth user.
  const tables: { table: string; col: string }[] = [
    { table: "speaking_sessions", col: "user_id" },
    { table: "speaking_courses", col: "user_id" },
    { table: "curricula", col: "user_id" },
    { table: "lessons", col: "user_id" },
    { table: "conversations", col: "user_id" },
    { table: "voice_usage", col: "user_id" },
    { table: "vocabulary_user_state", col: "user_id" },
    { table: "user_sessions", col: "user_id" },
  ];
  for (const item of tables) {
    const { error } = await admin.from(item.table).delete().eq(item.col, uid);
    if (error) return NextResponse.json({ error: `delete_failed:${item.table}` }, { status: 500 });
  }

  const profileDel = await admin.from("profiles").delete().eq("id", uid);
  if (profileDel.error) return NextResponse.json({ error: "delete_failed:profiles" }, { status: 500 });

  // best-effort: remove avatar file (ignore result)
  await admin.storage.from("avatars").remove([`${uid}.jpg`]);

  const authDel = await admin.auth.admin.deleteUser(uid);
  if (authDel.error) return NextResponse.json({ error: "delete_failed:auth" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
