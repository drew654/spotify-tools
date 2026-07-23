import { exchangeCodeForTokens } from "@/lib/spotify";
import { startLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const msg = error ?? "No code returned";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(msg)}`, request.url),
    );
  }

  const ok = await exchangeCodeForTokens(code);
  if (!ok) {
    return NextResponse.redirect(
      new URL("/settings?error=token_exchange_failed", request.url),
    );
  }

  // Auto-start the logger now that we have tokens
  startLogger();

  return NextResponse.redirect(new URL("/?connected=1", request.url));
};

