"use client";

import { useEffect, useState } from "react";
import TrackCard from "./TrackCard";
import StatusBadge from "./StatusBadge";
import { Music } from "lucide-react";

interface NowPlaying {
  id: string;
  name: string;
  artists: string[];
  albumName: string | null;
  albumArt: string | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
}

interface StatusResponse {
  running: boolean;
  lastError: string | null;
  pollCount: number;
  nowPlaying: NowPlaying | null;
  totalLogged: number;
}

const NowPlayingPanel = () => {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = (await res.json()) as StatusResponse;
        setData(json);
        if (json.nowPlaying) {
          setProgress(json.nowPlaying.progressMs);
        }
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll status every 8 seconds
  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 8000);
    return () => clearInterval(interval);
  }, []);

  // Increment playback progress bar locally each second when playing
  useEffect(() => {
    if (!data?.nowPlaying?.isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1000;
        if (data.nowPlaying && next >= data.nowPlaying.durationMs) {
          void fetchStatus(); // Refresh status when track ends
          return data.nowPlaying.durationMs;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center h-48 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-spotify-green border-t-transparent animate-spin mb-4" />
        <span className="text-zinc-400 text-sm">
          Loading current playback...
        </span>
      </div>
    );
  }

  const np = data?.nowPlaying;
  const progressPercent =
    np && np.durationMs > 0 ? (progress / np.durationMs) * 100 : 0;

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Now Playing
          {np?.isPlaying && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-spotify-green animate-ping" />
          )}
        </h3>
        <div className="flex items-center gap-2">
          <StatusBadge
            active={data?.running ?? false}
            label={data?.running ? "Logger Active" : "Logger Inactive"}
          />
        </div>
      </div>

      {np ? (
        <div className="flex flex-col gap-4">
          <TrackCard
            name={np.name}
            artists={np.artists}
            albumName={np.albumName}
            albumArt={np.albumArt}
            isPlaying={np.isPlaying}
          />

          {/* Progress Slider */}
          <div className="flex flex-col gap-1.5 px-1 mt-2">
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-spotify-green rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 font-mono">
              <span>{formatMs(progress)}</span>
              <span>{formatMs(np.durationMs)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 bg-black/20 rounded-xl border border-white/5">
          <Music className="w-12 h-12 text-zinc-600 mb-3" />
          <span className="text-zinc-400 text-sm font-semibold">
            No track currently playing
          </span>
          <span className="text-zinc-500 text-xs mt-1">
            Start playing music on Spotify
          </span>
        </div>
      )}
    </div>
  );
};

export default NowPlayingPanel;
