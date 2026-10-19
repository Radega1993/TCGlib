import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/lib/api";
import { safeNextPath } from "@/lib/catalog-query";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const returnTo = safeNextPath(request.nextUrl.searchParams.get("return") ?? undefined);
  const failed = () =>
    NextResponse.redirect(
      new URL(`/entrar?error=sesion&return=${encodeURIComponent(returnTo)}`, request.url),
    );

  if (code.length < 20) return failed();

  const response = await fetch(`${serverApiUrl()}/api/auth/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return failed();

  const body = (await response.json().catch(() => null)) as {
    data?: { token?: string; maxAge?: number };
  } | null;
  const token = body?.data?.token;
  if (!token) return failed();

  const redirect = NextResponse.redirect(new URL(returnTo, request.url));
  redirect.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: body?.data?.maxAge ?? 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return redirect;
}
