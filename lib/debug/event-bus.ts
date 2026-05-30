import * as Sentry from "@sentry/nextjs";

export type DebugEvent = {
  timestamp: number;
  kind: "mic" | "vad" | "transcribe" | "engine" | "tts" | "state" | "error" | "network";
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
};

const RING_SIZE = 200;
const events: DebugEvent[] = [];
const listeners = new Set<(e: DebugEvent) => void>();

export function logEvent(e: Omit<DebugEvent, "timestamp">) {
  const event: DebugEvent = { ...e, timestamp: Date.now() };
  events.push(event);
  if (events.length > RING_SIZE) events.shift();
  listeners.forEach((l) => l(event));

  try {
    Sentry.addBreadcrumb({
      category: e.kind,
      level: e.level === "error" ? "error" : "info",
      message: e.message,
      data: e.data,
    });
  } catch {
    /* Sentry may be unavailable in some contexts */
  }

  const prefix = `[${e.kind}]`;
  if (e.level === "error") console.error(prefix, e.message, e.data);
  else if (e.level === "warn") console.warn(prefix, e.message, e.data);
  else console.log(prefix, e.message, e.data);
}

export function getEvents(): DebugEvent[] {
  return [...events];
}

export function subscribe(cb: (e: DebugEvent) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function clearEvents() {
  events.length = 0;
}
