import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * WEBVIEW COOKIE GUARD. In the Android app's WebView, the auth cookie write
 * can lag the sign-in API call — a navigation fired immediately after
 * signInWithPassword arrived at the server WITHOUT the session cookie and
 * bounced back to /login (the "I have to log in twice" bug; a plain
 * full-page navigation was not enough). This waits until the session cookie
 * is actually readable before anyone navigates. On desktop browsers the
 * cookie exists immediately, so the wait is zero.
 */
export async function waitForAuthCookie(supabase: SupabaseClient, maxMs = 2000): Promise<void> {
  const ready = async (): Promise<boolean> => {
    try {
      const hasCookie = typeof document !== "undefined" && document.cookie.includes("-auth-token");
      if (!hasCookie) return false;
      const { data } = await supabase.auth.getSession();
      return data.session != null;
    } catch {
      return false;
    }
  };
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await ready()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  // Best effort: navigate anyway after the window — never trap the user here.
}
