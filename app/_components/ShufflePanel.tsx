"use client";

import { useState, useRef } from "react";
import { Shuffle, ListMusic, Square, Calendar } from "lucide-react";
import { useStatus } from "./StatusProvider";

interface ShuffleProgress {
  total: number;
  added: number;
  failed: number;
  done: boolean;
  stopped?: boolean;
  error?: string;
}

type FilterMode = "today" | "week" | "month" | "custom";

interface FilterOption {
  mode: FilterMode;
  label: string;
  description: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { mode: "today", label: "New for today", description: "Not played since midnight" },
  { mode: "week", label: "New for this week", description: "Not played since Sunday" },
  { mode: "month", label: "New for this month", description: "Not played since the 1st" },
  { mode: "custom", label: "New for x days", description: "Custom day window" },
];

const ShufflePanel = () => {
  const { status } = useStatus();
  const [filterMode, setFilterMode] = useState<FilterMode>("week");
  const [customDays, setCustomDays] = useState<string>("14");
  const [maxQueue, setMaxQueue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState<ShuffleProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const targetPlaylist = status?.currentContext?.playlist?.name ?? null;

  const handleStop = async () => {
    if (!loading || stopping) return;
    setStopping(true);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      await fetch("/api/shuffle/stop", {
        method: "POST",
      });
    } catch (err) {
      console.error("Error stopping shuffle queue:", err);
    } finally {
      setStopping(false);
      setLoading(false);
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              done: true,
              stopped: true,
            }
          : null,
      );
    }
  };

  const handleShuffle = async () => {
    setLoading(true);
    setStopping(false);
    setProgress(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const parsedMaxQueue = maxQueue.trim() !== "" ? parseInt(maxQueue, 10) : null;
    const parsedCustomDays = parseInt(customDays, 10);

    const payload: {
      filterMode: FilterMode;
      customDays?: number;
      maxQueue?: number;
    } = { filterMode };

    if (filterMode === "custom" && !isNaN(parsedCustomDays) && parsedCustomDays > 0) {
      payload.customDays = parsedCustomDays;
    }

    if (parsedMaxQueue !== null && !isNaN(parsedMaxQueue) && parsedMaxQueue > 0) {
      payload.maxQueue = parsedMaxQueue;
    }

    try {
      const response = await fetch("/api/shuffle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
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
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setProgress((prev) => ({
          total: prev?.total ?? 0,
          added: prev?.added ?? 0,
          failed: prev?.failed ?? 0,
          done: true,
          stopped: true,
        }));
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setProgress((prev) => ({
          total: prev?.total ?? 0,
          added: prev?.added ?? 0,
          failed: prev?.failed ?? 0,
          done: true,
          error: msg,
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      setStopping(false);
    }
  };

  const percent =
    progress && progress.total > 0
      ? Math.min(
          100,
          Math.round(((progress.added + progress.failed) / progress.total) * 100),
        )
      : 0;

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white">
          Smart Playlist Shuffler
        </h3>
        <p className="text-zinc-500 text-xs mt-1">
          Smart-shuffles your currently playing playlist by excluding recently
          played tracks from your database.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Filter mode selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-spotify-green" />
            Freshness Filter
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filterMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  disabled={loading}
                  onClick={() => setFilterMode(opt.mode)}
                  className={`relative flex flex-col items-start px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    isActive
                      ? "bg-spotify-green/15 border-spotify-green/50 text-white"
                      : "bg-white/5 border-white/8 text-zinc-400 hover:border-white/20 hover:text-zinc-200 hover:bg-white/8"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-spotify-green" />
                  )}
                  <span className={`text-xs font-semibold ${isActive ? "text-spotify-green" : ""}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom days input */}
          {filterMode === "custom" && (
            <div className="flex items-center gap-3 mt-1 pl-1">
              <input
                id="customDaysInput"
                type="number"
                disabled={loading}
                min={1}
                value={customDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || parseInt(val) >= 1) setCustomDays(val);
                }}
                className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-spotify-green"
              />
              <span className="text-xs text-zinc-500">
                days to look back
              </span>
            </div>
          )}
        </div>

        {/* Queue Limit */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
          <label
            className="text-xs text-zinc-400 font-semibold"
            htmlFor="queueLimitInput"
          >
            Queue Limit
          </label>
          <div className="flex items-center gap-3">
            <input
              id="queueLimitInput"
              type="number"
              disabled={loading}
              min={1}
              placeholder="All"
              value={maxQueue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || parseInt(val) >= 1) {
                  setMaxQueue(val);
                }
              }}
              className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-spotify-green placeholder:text-zinc-600"
            />
            <span className="text-xs text-zinc-500">
              Max songs to queue (leave empty for all).
            </span>
          </div>
        </div>

        {targetPlaylist && (
          <div className="flex items-center gap-2 text-xs text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-3.5 py-2.5 rounded-xl font-medium">
            <ListMusic className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Target Playlist: <strong>{targetPlaylist}</strong>
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {!loading ? (
          <button
            type="button"
            onClick={handleShuffle}
            className="btn-spotify rounded-xl py-3 text-center flex items-center justify-center gap-2 font-bold cursor-pointer"
          >
            <Shuffle className="w-5 h-5" />
            <span>Trigger Smart Shuffle</span>
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 text-zinc-300 font-semibold text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-spotify-green border-t-transparent animate-spin" />
              <span>Queueing Shuffled Songs...</span>
            </div>
            <button
              type="button"
              disabled={stopping}
              onClick={handleStop}
              className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:bg-red-500/30 rounded-xl px-5 py-3 flex items-center justify-center gap-2 font-bold text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{stopping ? "Stopping..." : "Stop Queueing"}</span>
            </button>
          </div>
        )}

        {/* Progress Display */}
        {progress && (
          <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold">
                {progress.stopped ? (
                  <span className="text-amber-400">
                    Queueing stopped by user
                  </span>
                ) : progress.done ? (
                  <span className="text-zinc-400">Queue complete</span>
                ) : (
                  <span className="text-zinc-400">
                    Adding tracks to Spotify queue...
                  </span>
                )}
              </span>
              <span className="text-zinc-300 font-mono">
                {progress.added} / {progress.total}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.error
                    ? "bg-red-500"
                    : progress.stopped
                      ? "bg-amber-500"
                      : "bg-spotify-green"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>{percent}% Completed</span>
              <div className="flex items-center gap-3">
                {progress.stopped && (
                  <span className="text-amber-400 font-semibold">Stopped</span>
                )}
                {progress.failed > 0 && (
                  <span className="text-red-400 font-semibold">
                    {progress.failed} skipped
                  </span>
                )}
              </div>
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
