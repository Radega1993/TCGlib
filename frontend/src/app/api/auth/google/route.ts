import { NextRequest, NextResponse } from "next/server";
import { publicApiUrl } from "@/lib/api";
import { safeNextPath } from "@/lib/catalog-query";

export function GET(request: NextRequest) {
  const returnTo = safeNextPath(request.nextUrl.searchParams.get("return") ?? undefined);
  const url = new URL("/api/auth/google", publicApiUrl());
  url.searchParams.set("return", returnTo);
  return NextResponse.redirect(url);
}
