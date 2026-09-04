"use client";

import { useEffect, useState } from "react";
import TrackCard from "./TrackCard";
import StatusBadge from "./StatusBadge";
import { Music, ListMusic, ExternalLink, Disc, Radio } from "lucide-react";
import { useStatus } from "./StatusProvider";

const NowPlayingPanel = () => {
  const { status: data, loading, refreshStatus } = useStatus();
  const [progress, setProgress] = useState(0);

  // Sync progress with status updates
  useEffect(() => {
    if (data?.nowPlaying) {
      setProgress(data.nowPlaying.progressMs);
    }
  }, [data?.nowPlaying?.id, data?.nowPlaying?.progressMs]);

  // Increment playback progress bar locally each second when playing
  useEffect(() => {
    if (!data?.nowPlaying?.isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1000;
        if (data.nowPlaying && next >= data.nowPlaying.durationMs) {
          void refreshStatus(); // Refresh status when track ends
          return data.nowPlaying.durationMs;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data, refreshStatus]);

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
  const ctx = data?.currentContext;
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
          <div className="flex flex-col gap-1.5 px-1 mt-1">
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

          {/* Active Playback / Playlist Context Section */}
          <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold flex items-center gap-1.5">
                <ListMusic className="w-4 h-4 text-spotify-green" />
                Active Playlist / Source
              </span>
              {ctx?.type && (
                <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-zinc-400 border border-white/5">
                  {ctx.type}
                </span>
              )}
            </div>

            {ctx?.playlist ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3.5 group hover:border-spotify-green/40 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden relative shadow-md">
                  {ctx.playlist.imageUrl ? (
                    <img
                      src={ctx.playlist.imageUrl}
                      alt={ctx.playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-800/80">
                      <ListMusic className="w-6 h-6 text-spotify-green" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-white font-semibold text-sm truncate group-hover:text-spotify-green transition-colors">
                      {ctx.playlist.name}
                    </h5>
                    {ctx.playlist.externalUrl && (
                      <a
                        href={ctx.playlist.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors shrink-0"
                        title="Open playlist in Spotify"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    {ctx.playlist.ownerName && (
                      <span>by {ctx.playlist.ownerName}</span>
                    )}
                    {ctx.playlist.ownerName && ctx.playlist.totalTracks > 0 && (
                      <span>•</span>
                    )}
                    {ctx.playlist.totalTracks > 0 && (
                      <span className="font-mono text-zinc-400">
                        {ctx.playlist.totalTracks} tracks
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : ctx ? (
              <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-400">
                <Disc className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  Playing from {ctx.type === "album" ? "an Album" : ctx.type === "artist" ? "an Artist" : ctx.type} context.
                </span>
              </div>
            ) : (
              <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-500">
                <Radio className="w-4 h-4 text-zinc-600 shrink-0" />
                <span>No playlist context detected (e.g. Liked Songs or direct queue)</span>
              </div>
            )}
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
