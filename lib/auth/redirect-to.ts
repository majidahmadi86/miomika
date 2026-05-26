/**
 * Post-login redirect preservation — stores intended destination when auth
 * intercepts a protected route (e.g. /me → /login).
 */

const STORAGE_KEY = "miomika.redirect_to";

const BLOCKED_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/api",
  "/onboarding",
];

/** Same-origin app paths only — blocks open redirects. */
export function isValidAppRedirect(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (BLOCKED_PREFIXES.some((b) => path === b || path.startsWith(`${b}/`) || path.startsWith(`${b}?`))) {
    return false;
  }
  return true;
}

export function storeRedirectTo(path: string): void {
  if (typeof window === "undefined" || !isValidAppRedirect(path)) return;
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function readRedirectTo(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored && isValidAppRedirect(stored)) return stored;
  return null;
}

export function readRedirectToFromSearch(search: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search);
  const param = params.get("redirect_to");
  if (param && isValidAppRedirect(param)) {
    storeRedirectTo(param);
    return param;
  }
  return null;
}

export function resolveRedirectTarget(search?: string): string | null {
  const fromSearch = search ? readRedirectToFromSearch(search) : null;
  if (fromSearch) return fromSearch;
  return readRedirectTo();
}

export function clearRedirectTo(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
