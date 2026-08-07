import { createServiceClient } from "@/lib/supabase/service";
import { rangeIso, type ParsedRange } from "@/lib/admin/time-range";

export type ServiceStatus = "ok" | "stale" | "unknown";

export type ServiceLive = {
  id: string;
  name: string;
  status: ServiceStatus;
  line: string;
};

export type ReminderRow = {
  id: string;
  title: string;
  kind: string;
  due_date: string | null;
  note: string | null;
  done: boolean;
  created_at: string;
};

function ago(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusFromAge(iso: string | null | undefined, staleAfterMs: number): ServiceStatus {
  if (!iso) return "unknown";
  return Date.now() - new Date(iso).getTime() > staleAfterMs ? "stale" : "ok";
}

/** Liveness from data we already hold · no external status APIs. */
export async function buildWatchboard(range: ParsedRange): Promise<{
  services: ServiceLive[];
  reminders: ReminderRow[];
  remindersReady: boolean;
}> {
  const supabase = await createServiceClient();
  const { fromIso, toIso } = rangeIso(range);
  void fromIso;
  void toIso;

  // Last successful llm_usage per provider
  const { data: llmOk } = await supabase
    .from("llm_usage")
    .select("provider, created_at, ok")
    .eq("ok", true)
    .order("created_at", { ascending: false })
    .limit(500);
  const lastByProvider = new Map<string, string>();
  for (const r of (llmOk ?? []) as { provider: string | null; created_at: string }[]) {
    const p = (r.provider || "unknown").toLowerCase();
    if (!lastByProvider.has(p)) lastByProvider.set(p, r.created_at);
  }

  const geminiAt = lastByProvider.get("gemini") ?? null;
  const groqAt = lastByProvider.get("groq") ?? lastByProvider.get("groq_whisper") ?? null;
  const ttsAt = lastByProvider.get("google_tts") ?? null;

  const { data: lastWh } = await supabase
    .from("webhook_events")
    .select("created_at, ok")
    .order("created_at", { ascending: false })
    .limit(1);
  const stripeAt = (lastWh?.[0] as { created_at: string } | undefined)?.created_at ?? null;

  // Resend trail = care_notifications if present
  let resendAt: string | null = null;
  let resendKnown = false;
  {
    const { data, error } = await supabase
      .from("care_notifications")
      .select("sent_at")
      .order("sent_at", { ascending: false })
      .limit(1);
    if (!error) {
      resendKnown = true;
      resendAt = (data?.[0] as { sent_at: string } | undefined)?.sent_at ?? null;
    }
  }

  const day = 864e5;
  const services: ServiceLive[] = [
    {
      id: "gemini",
      name: "Gemini",
      status: statusFromAge(geminiAt, 2 * day),
      line: geminiAt ? `OK · ${ago(geminiAt)}` : "no successful calls yet",
    },
    {
      id: "google_tts",
      name: "Google TTS",
      status: statusFromAge(ttsAt, 2 * day),
      line: ttsAt ? `OK · ${ago(ttsAt)}` : "no successful calls yet",
    },
    {
      id: "groq",
      name: "Groq",
      status: statusFromAge(groqAt, 2 * day),
      line: groqAt ? `OK · ${ago(groqAt)}` : "no successful calls yet",
    },
    {
      id: "stripe",
      name: "Stripe",
      status: statusFromAge(stripeAt, 7 * day),
      line: stripeAt ? `last webhook · ${ago(stripeAt)}` : "no webhook events",
    },
    {
      id: "resend",
      name: "Resend",
      status: resendKnown ? statusFromAge(resendAt, 14 * day) : "unknown",
      line: resendKnown
        ? resendAt
          ? `care email · ${ago(resendAt)}`
          : "no care emails logged"
        : "care_notifications unavailable",
    },
    {
      id: "supabase",
      name: "Supabase",
      status: "ok",
      line: "serving",
    },
    {
      id: "vercel",
      name: "Vercel",
      status: "ok",
      line: "serving",
    },
  ];

  let reminders: ReminderRow[] = [];
  let remindersReady = false;
  {
    const { data, error } = await supabase
      .from("admin_reminders")
      .select("id, title, kind, due_date, note, done, created_at")
      .eq("done", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50);
    if (!error) {
      remindersReady = true;
      reminders = (data ?? []) as ReminderRow[];
    }
  }

  return { services, reminders, remindersReady };
}
