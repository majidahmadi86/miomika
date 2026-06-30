import { notFound } from "next/navigation";
import { getServerProfile, type ServerProfile } from "@/lib/auth/get-server-profile";

function emailIsAdmin(email: string | null | undefined): boolean {
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const e = email?.toLowerCase() ?? "";
  return (e !== "" && allow.includes(e)) || process.env.NODE_ENV === "development";
}

/**
 * Pages: gate the whole route, or render 404 (we don't reveal the console exists).
 * Access = email in ADMIN_EMAILS, or any signed-in user in local dev.
 */
export async function requireAdmin(): Promise<ServerProfile> {
  const profile = await getServerProfile();
  if (!profile || !emailIsAdmin(profile.email)) notFound();
  return profile;
}

/**
 * API routes: returns the admin's profile, or null so the caller can return 403.
 * (notFound() is page-only — APIs need a real status code.)
 */
export async function getAdminProfile(): Promise<ServerProfile | null> {
  const profile = await getServerProfile();
  if (!profile || !emailIsAdmin(profile.email)) return null;
  return profile;
}
