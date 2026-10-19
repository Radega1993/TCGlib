import { NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/catalog-query";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export function GET(request: NextRequest) {
  const returnTo = safeNextPath(request.nextUrl.searchParams.get("return") ?? undefined);
  const url = new URL("/api/auth/google", API_URL);
  url.searchParams.set("return", returnTo);
  return NextResponse.redirect(url);
}
