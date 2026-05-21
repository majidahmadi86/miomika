// /lib/library/sessionOpener.ts
import { GREETING_BY_TIME, GREETING_APPENDS } from "./responses";

export function getSessionOpener(userContext: {
  isFirstSession: boolean;
  hoursSinceLastSession: number | null;
  streakDays: number;
  timezone?: string;
}): { speech_th: string; speech_en: string } {
  // Determine time window
  const now = new Date();
  const tz = userContext.timezone ?? "Asia/Bangkok";
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(now),
    10
  );

  let timeKey: keyof typeof GREETING_BY_TIME;
  if (hour >= 5 && hour < 11) timeKey = "morning";
  else if (hour >= 11 && hour < 14) timeKey = "lunch";
  else if (hour >= 14 && hour < 18) timeKey = "afternoon";
  else if (hour >= 18 && hour < 22) timeKey = "evening";
  else timeKey = "night";

  const baseGreeting = GREETING_BY_TIME[timeKey];

  // Determine append
  let appendKey: keyof typeof GREETING_APPENDS;
  if (userContext.isFirstSession) appendKey = "first_session_ever";
  else if (userContext.streakDays === 7) appendKey = "streak_day_7";
  else if (userContext.hoursSinceLastSession === null || userContext.hoursSinceLastSession < 24)
    appendKey = "returning_under_24h";
  else if (userContext.hoursSinceLastSession < 24 * 8) appendKey = "returning_1_to_7_days";
  else appendKey = "returning_7_plus_days";

  const append = GREETING_APPENDS[appendKey];

  return {
    speech_th: `${baseGreeting.th} ${append.th}`,
    speech_en: `${baseGreeting.en} ${append.en}`,
  };
}
