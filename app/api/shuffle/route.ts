import {
  customShuffle,
  stopShuffle,
  type ShuffleProgress,
} from "@/lib/shuffle";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const recentLimit =
      typeof body.recentLimit === "number" ? body.recentLimit : 50;
    const maxQueue =
      typeof body.maxQueue === "number" && body.maxQueue > 0
        ? body.maxQueue
        : null;

    const encoder = new TextEncoder();

    request.signal.addEventListener("abort", () => {
      stopShuffle();
    });

    // Create a readable stream to stream progress back to client using server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const sendProgress = (progress: ShuffleProgress) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
            );
          } catch {
            isClosed = true;
          }
        };

        try {
          await customShuffle(
            { recentLimit, maxQueue, signal: request.signal },
            sendProgress,
          );
        } catch (error) {
          if (!isClosed) {
            const message =
              error instanceof Error ? error.message : String(error);
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: message, done: true })}\n\n`,
                ),
              );
            } catch {}
          }
        } finally {
          if (!isClosed) {
            try {
              controller.close();
            } catch {}
          }
        }
      },
      cancel() {
        stopShuffle();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
