import { Music } from "lucide-react";

interface TrackCardProps {
  name: string;
  artists: string | string[];
  albumName?: string | null;
  albumArt?: string | null;
  playedAt?: string | null;
  isPlaying?: boolean;
}

const TrackCard = ({
  name,
  artists,
  albumName,
  albumArt,
  playedAt,
  isPlaying,
}: TrackCardProps) => {
  const artistList = Array.isArray(artists) ? artists.join(", ") : artists;

  // Format playedAt to locale string if present
  const formattedTime = playedAt
    ? new Date(playedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  const formattedDate = playedAt
    ? new Date(playedAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="glass-panel rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group shrink-0">
      {/* Background Glow when playing */}
      {isPlaying && (
        <div className="absolute inset-0 bg-spotify-green/5 pointer-events-none animate-pulse-slow" />
      )}

      {/* Album Art */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
        {albumArt ? (
          <img
            src={albumArt}
            alt={albumName ?? name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <Music className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Track Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-semibold truncate text-base group-hover:text-spotify-green transition-colors">
            {name}
          </h4>
          {isPlaying && (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-spotify-green animate-[bounce_1s_infinite_100ms] h-2"></span>
              <span className="w-0.5 bg-spotify-green animate-[bounce_1s_infinite_300ms] h-3"></span>
              <span className="w-0.5 bg-spotify-green animate-[bounce_1s_infinite_200ms] h-1.5"></span>
            </span>
          )}
        </div>
        <p className="text-zinc-400 text-sm truncate mt-0.5">{artistList}</p>
        {albumName && (
          <p className="text-zinc-500 text-xs truncate mt-1 italic">
            {albumName}
          </p>
        )}
      </div>

      {/* Played At Time indicator */}
      {(formattedTime || formattedDate) && (
        <div className="text-right flex-shrink-0 text-xs text-zinc-500 flex flex-col justify-center">
          {formattedTime && (
            <span className="font-mono text-zinc-400">{formattedTime}</span>
          )}
          {formattedDate && (
            <span className="text-[10px] mt-0.5">{formattedDate}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackCard;
