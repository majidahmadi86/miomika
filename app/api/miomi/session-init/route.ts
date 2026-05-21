import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SESSION_OPENERS = {
  first_session_ever: {
    th: "สวัสดีค่า~ หนูชื่อมิโอมิค่า อยากเรียกหนูว่าอะไรดีคะ?",
    en: "Hi~ I'm Miomi. What would you like to call me?",
  },
  returning_under_24h: {
    th: "กลับมาแล้วค่า~ วันนี้อยากคุยเรื่องอะไรคะ?",
    en: "You're back~ what shall we talk about today?",
  },
  returning_3_plus_days: {
    th: "คิดถึงค่า~ ผ่านไปหลายวันเลยนะคะ วันนี้เป็นไงบ้างคะ?",
    en: "I missed you~ it's been a few days. How are you today?",
  },
  streak_day_7: {
    th: "ครบ 7 วันแล้วค่า~ เก่งมากเลยนะ! วันนี้อยากทำอะไรดีคะ?",
    en: "A full 7 days~ amazing! What shall we do today?",
  },
  fallback: {
    th: "สวัสดีค่า~ วันนี้คุยอะไรกันดีคะ?",
    en: "Hi~ what shall we talk about today?",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(SESSION_OPENERS.fallback);
    }

    const supabase = await createClient();

    // Get user's last session
    const { data: lastSession } = await supabase
      .from("user_sessions")
      .select("started_at, words_introduced, detected_level")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastSession) {
      return NextResponse.json(SESSION_OPENERS.first_session_ever);
    }

    const hoursSinceLast = lastSession.started_at
      ? (Date.now() - new Date(lastSession.started_at).getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLast < 24) {
      return NextResponse.json(SESSION_OPENERS.returning_under_24h);
    }

    if (hoursSinceLast > 72) {
      return NextResponse.json(SESSION_OPENERS.returning_3_plus_days);
    }

    return NextResponse.json(SESSION_OPENERS.fallback);

  } catch {
    return NextResponse.json({
      th: "สวัสดีค่า~ วันนี้คุยอะไรกันดีคะ?",
      en: "Hi~ what shall we talk about today?",
    });
  }
}
