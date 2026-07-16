import webpush from "web-push";

/**
 * Web-push sender for Miomi's care notifications. VAPID keys come from env:
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY (also used by the browser to subscribe) and
 * VAPID_PRIVATE_KEY (server only). Without them, sends no-op cleanly so the
 * dispatcher falls back to email.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:support@miomika.com", pub, priv);
  configured = true;
  return true;
}

export type PushRow = { endpoint: string; p256dh: string; auth: string };

/**
 * Send one push. `gone: true` means the subscription is dead (404/410) and
 * the caller should delete the row.
 */
export async function sendCarePush(
  row: PushRow,
  payload: { title: string; body: string; url: string },
): Promise<{ ok: boolean; gone: boolean }> {
  if (!ensureConfigured()) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, gone: false };
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    return { ok: false, gone: code === 404 || code === 410 };
  }
}
