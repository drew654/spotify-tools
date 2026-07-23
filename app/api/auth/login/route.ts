import { buildAuthUrl } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const GET = async (request: NextRequest) => {
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(state);

  return NextResponse.redirect(authUrl);
};
