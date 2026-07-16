import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * One-click unsubscribe from Miomi's care notes. The link in every email is
 * signed (HMAC of the user id with CRON_SECRET), so it works without login
 * on any device. Flipping care_emails_enabled back on is a settings action
 * inside the app.
 */

function expectedSig(userId: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Miomika</title></head>
<body style="margin:0;background:#FBFAF6;font-family:'Quicksand','Kanit',sans-serif;color:#1A1A18;">
  <div style="max-width:420px;margin:48px auto;padding:24px;text-align:center;">
    <img src="https://miomika.com/miomi/head-idle.png" alt="Miomi" width="80" height="80" style="display:block;margin:0 auto 16px;" />
    <h1 style="font-size:18px;color:#C9A96E;margin:0 0 10px;">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#6B6257;margin:0 0 24px;">${body}</p>
    <a href="https://miomika.com/home" style="display:inline-block;background:linear-gradient(135deg,#E8C77A 0%,#C9A96E 100%);color:#FFFFFF;text-decoration:none;padding:11px 28px;border-radius:999px;font-size:14px;font-weight:600;">Miomika</a>
  </div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  const expected = expectedSig(userId);
  const valid =
    userId.length > 0 &&
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

  if (!valid || !process.env.CRON_SECRET) {
    return page(
      "This link has expired",
      "Please open Miomika and manage notifications from your settings. · ลิงก์นี้ใช้ไม่ได้แล้วค่ะ จัดการการแจ้งเตือนได้ในแอปนะคะ",
    );
  }

  const supabase = await createServiceClient();
  await supabase.from("profiles").update({ care_emails_enabled: false }).eq("id", userId);

  return page(
    "Miomi understands ค่ะ",
    "You won't get these little notes anymore. If you ever miss them, you can turn them back on in the app. · หนูจะไม่ส่งโน้ตเล็กๆ มาแล้วนะคะ ถ้าคิดถึงเมื่อไหร่ เปิดกลับได้ในแอปเสมอค่ะ",
  );
}
