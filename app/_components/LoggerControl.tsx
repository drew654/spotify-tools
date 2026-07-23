"use client";

import { useState, useEffect } from "react";

interface Status {
  running: boolean;
  lastError: string | null;
  pollCount: number;
}

const LoggerControl = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = (await res.json()) as Status;
        setStatus(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleLogger = async () => {
    if (!status) return;
    setLoading(true);
    const action = status.running ? "stop" : "start";

    try {
      const res = await fetch("/api/logger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Status;
        setStatus(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!status) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white">
          Background Logger Control
        </h3>
        <p className="text-zinc-500 text-xs mt-1">
          Controls the server-side cron loop polling currently playing tracks.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl p-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              Logger Status
            </span>
            <span
              className={`text-base font-bold mt-1 ${status.running ? "text-spotify-green" : "text-red-500"}`}
            >
              {status.running ? "Running" : "Stopped"}
            </span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={toggleLogger}
            className={`cursor-pointer rounded-xl px-5 py-2.5 font-bold text-sm transition-all duration-200 ${
              status.running
                ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                : "bg-spotify-green/10 text-spotify-green border border-spotify-green/20 hover:bg-spotify-green/20"
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : status.running ? (
              "Stop Logger"
            ) : (
              "Start Logger"
            )}
          </button>
        </div>

        {status.lastError && (
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex flex-col gap-1">
            <span className="font-bold">Last Error:</span>
            <span className="font-mono text-[11px] leading-tight break-all">
              {status.lastError}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoggerControl;
