"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

interface ShuffleProgress {
  total: number;
  added: number;
  failed: number;
  done: boolean;
  error?: string;
}

const ShufflePanel = () => {
  const [recentLimit, setRecentLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ShuffleProgress | null>(null);

  const handleShuffle = async () => {
    setLoading(true);
    setProgress(null);

    try {
      const response = await fetch("/api/shuffle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recentLimit }),
      });

      if (!response.body) {
        throw new Error("No response stream available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");

        // Save the last potentially incomplete chunk
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              try {
                const update = JSON.parse(dataStr) as ShuffleProgress;
                setProgress(update);
                if (update.error) {
                  throw new Error(update.error);
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgress((prev) => ({
        total: prev?.total ?? 0,
        added: prev?.added ?? 0,
        failed: prev?.failed ?? 0,
        done: true,
        error: msg,
      }));
    } finally {
      setLoading(false);
    }
  };

  const percent =
    progress && progress.total > 0
      ? Math.round(((progress.added + progress.failed) / progress.total) * 100)
      : 0;

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white">
          Smart Playlist Shuffler
        </h3>
        <p className="text-zinc-500 text-xs mt-1">
          Smart-shuffles your currently playing playlist by excluding recently
          logged tracks from your database.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Shuffle options */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
          <label
            className="text-xs text-zinc-400 font-semibold"
            htmlFor="limitInput"
          >
            Exclude Limit
          </label>
          <div className="flex items-center gap-3">
            <input
              id="limitInput"
              type="number"
              disabled={loading}
              value={recentLimit}
              onChange={(e) =>
                setRecentLimit(Math.max(1, parseInt(e.target.value) || 0))
              }
              className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-spotify-green"
            />
            <span className="text-xs text-zinc-500">
              Most recently logged tracks in your database will not be queued.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleShuffle}
          className="btn-spotify rounded-xl py-3 text-center flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Building Shuffled Queue...</span>
            </>
          ) : (
            <>
              <Shuffle className="w-5 h-5" />
              <span>Trigger Smart Shuffle</span>
            </>
          )}
        </button>

        {/* Progress Display */}
        {progress && (
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-semibold">
                {progress.done
                  ? "Queue complete"
                  : "Adding tracks to Spotify queue..."}
              </span>
              <span className="text-zinc-300 font-mono">
                {progress.added} / {progress.total}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.error ? "bg-red-500" : "bg-spotify-green"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>{percent}% Completed</span>
              {progress.failed > 0 && (
                <span className="text-red-400 font-semibold">
                  {progress.failed} skipped
                </span>
              )}
            </div>

            {progress.error && (
              <div className="mt-1 text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
                <strong>Error: </strong> {progress.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShufflePanel;
