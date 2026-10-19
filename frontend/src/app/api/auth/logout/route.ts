import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${API_URL}/api/auth/session`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
  }

  const redirect = NextResponse.redirect(new URL("/", request.url), 303);
  redirect.cookies.delete(SESSION_COOKIE);
  return redirect;
}
