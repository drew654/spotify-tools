import {
  customShuffle,
  stopShuffle,
  type ShuffleProgress,
} from "@/lib/shuffle";
import { NextRequest, NextResponse } from "next/server";

type FilterMode = "today" | "week" | "month" | "custom";

const getSinceDate = (filterMode: FilterMode, customDays?: number): Date => {
  const now = new Date();

  switch (filterMode) {
    case "today": {
      // Start of the current calendar day in UTC
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      // Start of the current week: most recent Sunday at UTC midnight
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // rewind to Sunday
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      // Start of the current month: midnight of the 1st (UTC)
      const d = new Date(now);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "custom": {
      const days = typeof customDays === "number" && customDays > 0 ? customDays : 7;
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - days);
      return d;
    }
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));

    const filterMode: FilterMode =
      ["today", "week", "month", "custom"].includes(body.filterMode)
        ? (body.filterMode as FilterMode)
        : "week";

    const customDays =
      typeof body.customDays === "number" && body.customDays > 0
        ? body.customDays
        : undefined;

    const maxQueue =
      typeof body.maxQueue === "number" && body.maxQueue > 0
        ? body.maxQueue
        : null;

    const sinceDate = getSinceDate(filterMode, customDays);

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
            { sinceDate, maxQueue, signal: request.signal },
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
