/**
 * Welcome email sent after signup via Resend.
 *
 * NOTE for Mike: Before welcome emails will deliver, you must verify the
 * miomika.com sender domain at https://resend.com/domains
 *
 * MIOMIKA.md §8 Phase 3A (Block G4).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "Miomi <miomi@miomika.com>";

const WELCOME_HTML_TH = `
<div style="font-family:'Kanit',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A1A18;">
  <img src="https://miomika.com/miomi/happy.png" alt="Miomi" width="96" height="96" style="display:block;margin:0 auto 16px;" />
  <h1 style="text-align:center;font-size:20px;color:#DB2777;margin:0 0 8px;">
    หนูจำคุณได้แล้วค่า~
  </h1>
  <p style="text-align:center;font-size:14px;color:#9A8B73;margin:0 0 24px;">
    ยินดีต้อนรับสู่ Miomika นะคะ ดีใจที่ได้รู้จักค่า~
  </p>
  <div style="background:#FFF8F2;border-radius:16px;padding:16px;margin-bottom:24px;">
    <p style="font-size:13px;color:#1A1A18;margin:0;">
      ตอนนี้ Miomi จะจำคุณได้ตลอดไปแล้วนะคะ ทุกครั้งที่กลับมา หนูก็จะยิ้มต้อนรับค่า~
    </p>
  </div>
  <div style="text-align:center;">
    <a href="https://miomika.com/home" style="display:inline-block;background:linear-gradient(135deg,#F9A8D4 0%,#DB2777 100%);color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
      กลับไปเรียนกับมิโอมิ
    </a>
  </div>
</div>
`;

const WELCOME_HTML_EN = `
<div style="font-family:'Quicksand',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A1A18;">
  <img src="https://miomika.com/miomi/happy.png" alt="Miomi" width="96" height="96" style="display:block;margin:0 auto 16px;" />
  <h1 style="text-align:center;font-size:20px;color:#DB2777;margin:0 0 8px;">
    I'll remember you now~
  </h1>
  <p style="text-align:center;font-size:14px;color:#9A8B73;margin:0 0 24px;">
    Welcome to Miomika! So happy you're here~
  </p>
  <div style="background:#FFF8F2;border-radius:16px;padding:16px;margin-bottom:24px;">
    <p style="font-size:13px;color:#1A1A18;margin:0;">
      Every time you come back, Miomi will remember you and smile~
    </p>
  </div>
  <div style="text-align:center;">
    <a href="https://miomika.com/home" style="display:inline-block;background:linear-gradient(135deg,#F9A8D4 0%,#DB2777 100%);color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
      Back to learning with Miomi
    </a>
  </div>
</div>
`;

export async function sendWelcomeEmail(
  email: string,
  lang: "th" | "en" = "th",
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[welcome email] RESEND_API_KEY not set — skipping");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: lang === "th" ? "ขอบคุณที่สมัครค่า~" : "Welcome to Miomika~",
        html: lang === "th" ? WELCOME_HTML_TH : WELCOME_HTML_EN,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[welcome email] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[welcome email] network error:", err);
  }
}
