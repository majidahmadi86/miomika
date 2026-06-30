import { notFound } from "next/navigation";
import { getServerProfile } from "@/lib/auth/get-server-profile";

/**
 * The single admin gate for everything under /admin. Returns the admin's
 * profile, or renders 404 (not 403 — we don't reveal the console exists).
 * Access = email in ADMIN_EMAILS, or any signed-in user in local dev.
 */
export async function requireAdmin() {
  const profile = await getServerProfile();
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? "";
  const isAdmin = (email !== "" && allow.includes(email)) || process.env.NODE_ENV === "development";
  if (!profile || !isAdmin) notFound();
  return profile;
}
