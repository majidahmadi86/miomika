import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REF_COOKIE = "mk_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const clean = (code ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 16);

  const res = NextResponse.redirect(new URL("/signup", request.url));
  if (clean) {
    res.cookies.set(REF_COOKIE, clean, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REF_MAX_AGE,
    });
  }
  return res;
}
