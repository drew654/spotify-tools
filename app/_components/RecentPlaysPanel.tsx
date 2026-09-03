"use client";

import { useEffect, useState } from "react";
import TrackCard from "./TrackCard";
import { RefreshCw, History } from "lucide-react";

interface Play {
  id: number;
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  album_art: string | null;
  played_at: string;
}

const RecentPlaysPanel = () => {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlays = async () => {
    try {
      const res = await fetch("/api/history?limit=10");
      if (res.ok) {
        const data = (await res.json()) as Play[];
        setPlays(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlays();
    const interval = setInterval(() => void fetchPlays(), 12000);
    return () => clearInterval(interval);
  }, []);

  if (loading && plays.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-white/10 rounded" />
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="border-b border-white/5 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Recently Logged</h3>
          <p className="text-zinc-500 text-xs mt-1">
            The latest tracks captured by the background logger.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchPlays()}
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
          title="Refresh history"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
        {plays.length > 0 ? (
          plays.map((play) => (
            <TrackCard
              key={play.id}
              name={play.track_name}
              artists={play.artist_name}
              albumName={play.album_name}
              albumArt={play.album_art}
              playedAt={play.played_at}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <History className="w-10 h-10 mb-3 text-zinc-600" />
            <span className="text-sm">No plays logged yet</span>
            <span className="text-xs text-zinc-600 mt-1">
              Logger will write entries once Spotify is connected and active.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentPlaysPanel;
