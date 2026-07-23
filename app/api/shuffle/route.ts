import { customShuffle, type ShuffleProgress } from "@/lib/shuffle";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const recentLimit =
      typeof body.recentLimit === "number" ? body.recentLimit : 50;

    const encoder = new TextEncoder();

    // Create a readable stream to stream progress back to client using server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (progress: ShuffleProgress) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
          );
        };

        try {
          await customShuffle(recentLimit, sendProgress);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message, done: true })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
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
