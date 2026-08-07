/**
 * Internal / staff accounts excluded from growth & revenue KPIs.
 * Cost tabs still include them (real spend) but chip them in the UI.
 */
export function getInternalEmails(): string[] {
  const raw = process.env.INTERNAL_EMAILS?.trim();
  const parsed = (raw
    ? raw.split(",")
    : [...(process.env.ADMIN_EMAILS ?? "").split(","), "reviewer@miomika.com"]
  )
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(parsed)];
}

export function internalEmailSet(): Set<string> {
  return new Set(getInternalEmails());
}

export function isInternalEmail(
  email: string | null | undefined,
  set: Set<string> = internalEmailSet(),
): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return e !== "" && set.has(e);
}
