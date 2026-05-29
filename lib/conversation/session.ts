const SESSION_STORAGE_KEY = "miomika.conversation_session";
const RESUME_WINDOW_MS = 5 * 60 * 1000;

export type StoredSession = {
  sessionId: string;
  lastExchangeAt: number;
  sessionEndReason?: string;
};

export function saveSession(
  sessionId: string,
  lastExchangeAt: number,
  extras?: { sessionEndReason?: string },
): void {
  if (typeof window === "undefined") return;
  const payload: StoredSession = {
    sessionId,
    lastExchangeAt,
    ...(extras?.sessionEndReason ? { sessionEndReason: extras.sessionEndReason } : {}),
  };
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.sessionId || typeof parsed.lastExchangeAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function shouldResume(): boolean {
  const session = loadSession();
  if (!session) return false;
  return Date.now() - session.lastExchangeAt < RESUME_WINDOW_MS;
}

export function createSessionId(): string {
  return crypto.randomUUID();
}
