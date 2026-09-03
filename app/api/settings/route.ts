import { NextResponse } from "next/server";
import { hasCredentials } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const isEnvSet = !!(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
  );
  return NextResponse.json({
    envConfigured: isEnvSet,
    isConnected: await hasCredentials(),
  });
};
