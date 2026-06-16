import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = user.id;
  const admin = await createServiceClient();

  const sources: { key: string; table: string; col: string }[] = [
    { key: "profile", table: "profiles", col: "id" },
    { key: "vocabulary", table: "vocabulary_user_state", col: "user_id" },
    { key: "conversations", table: "conversations", col: "user_id" },
    { key: "voice_usage", table: "voice_usage", col: "user_id" },
    { key: "lessons", table: "lessons", col: "user_id" },
    { key: "curricula", table: "curricula", col: "user_id" },
    { key: "speaking_courses", table: "speaking_courses", col: "user_id" },
    { key: "speaking_sessions", table: "speaking_sessions", col: "user_id" },
    { key: "sessions", table: "user_sessions", col: "user_id" },
  ];

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: user.email ?? null },
  };
  for (const s of sources) {
    const { data: rows } = await admin.from(s.table).select("*").eq(s.col, uid);
    out[s.key] = rows ?? [];
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="miomika-data.json"',
    },
  });
}
