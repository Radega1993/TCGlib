import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${serverApiUrl()}/api/auth/session`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
  }

  const redirect = NextResponse.redirect(new URL("/", request.url), 303);
  redirect.cookies.delete(SESSION_COOKIE);
  return redirect;
}
