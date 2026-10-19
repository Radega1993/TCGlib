import { NextRequest } from "next/server";

export function publicOrigin(request: NextRequest) {
  const configured = process.env["WEB_ORIGIN"]?.replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || "";
  if (host && !host.startsWith("0.0.0.0")) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
