import { stopShuffle } from "@/lib/shuffle";
import { NextResponse } from "next/server";

export const POST = async () => {
  try {
    const wasStopped = stopShuffle();
    return NextResponse.json({
      success: true,
      stopped: wasStopped,
      message: wasStopped
        ? "Active shuffle queueing stopped."
        : "No active shuffle queueing was running.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
