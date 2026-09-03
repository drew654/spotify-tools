import { clearTokens } from "@/lib/db";
import { stopLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  try {
    stopLogger();
    clearTokens();
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
};

export const GET = async (request: NextRequest) => {
  try {
    stopLogger();
    clearTokens();
    return NextResponse.redirect(
      new URL("/settings?disconnected=1", request.url),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(msg)}`, request.url),
    );
  }
};
