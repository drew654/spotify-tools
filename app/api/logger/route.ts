import { startLogger, stopLogger, getLoggerStatus } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  try {
    const { action } = (await request.json()) as { action: "start" | "stop" };

    if (action === "start") {
      startLogger();
    } else if (action === "stop") {
      stopLogger();
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use start or stop." },
        { status: 400 },
      );
    }

    return NextResponse.json(getLoggerStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

