import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/api";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tcg = request.nextUrl.searchParams.get("tcg") === "riftbound" ? "riftbound" : "one-piece";
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    return NextResponse.json(await getSuggestions(q, tcg));
  } catch {
    return NextResponse.json({ data: [] });
  }
}
