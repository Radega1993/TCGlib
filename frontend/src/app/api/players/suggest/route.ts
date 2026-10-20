import { NextRequest, NextResponse } from "next/server";
import { serverApiUrl } from "@/lib/api";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 40) ?? "";
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const response = await fetch(
    `${serverApiUrl()}/api/players?q=${encodeURIComponent(q)}&limit=5`,
    { cache: "no-store" },
  ).catch(() => null);
  if (!response?.ok) return NextResponse.json({ data: [] });
  const body = (await response.json()) as { data?: unknown };
  const data = Array.isArray(body.data) ? body.data.slice(0, 5) : [];
  return NextResponse.json({ data });
}
