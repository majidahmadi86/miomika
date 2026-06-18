// app/api/admin/vertex-check/route.ts — admin-only health check for Gemini-on-Vertex
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerProfile } from "@/lib/auth/get-server-profile";

export async function GET() {
  const profile = await getServerProfile();
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? "";
  const isAdmin = (email !== "" && allow.includes(email)) || process.env.NODE_ENV === "development";
  if (!profile || !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "us-central1";
  const diag: Record<string, unknown> = {
    fallback_enabled: process.env.ENABLE_GEMINI_FALLBACK === "true",
    json_present: Boolean(raw),
    project_present: Boolean(project),
    location,
    sa_email: null,
    model: "gemini-2.5-flash",
    ok: false,
    sample: null,
    error: null,
  };

  if (!raw || !project) {
    diag.error = "Missing GCP_SERVICE_ACCOUNT_JSON or GCP_PROJECT_ID.";
    return NextResponse.json(diag);
  }
  try {
    const sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
    diag.sa_email = sa.client_email ?? null;
    if (!sa.client_email || !sa.private_key) {
      diag.error = "Service account JSON missing client_email/private_key.";
      return NextResponse.json(diag);
    }
    const ai = new GoogleGenAI({
      vertexai: true,
      project,
      location,
      googleAuthOptions: {
        credentials: { client_email: sa.client_email, private_key: sa.private_key },
      },
    });
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Translate the English word 'water' into Thai. Reply with ONLY the Thai word, nothing else.",
    });
    diag.sample = r.text ?? null;
    diag.ok = Boolean(r.text);
  } catch (err) {
    diag.error = String(err).slice(0, 600);
  }
  return NextResponse.json(diag);
}
