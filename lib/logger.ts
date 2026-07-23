import { getCurrentlyPlaying } from "./spotify";
import { logPlay, getToken, getRecentPlays } from "./db";

let _running = false;
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _lastTrackId: string | null = null;
let _lastError: string | null = null;
let _pollCount = 0;

const POLL_INTERVAL_MS = 30_000;

export const isRunning = (): boolean => {
  return _running;
};

export const getLoggerStatus = (): {
  running: boolean;
  lastError: string | null;
  pollCount: number;
} => {
  return {
    running: _running,
    lastError: _lastError,
    pollCount: _pollCount,
  };
};

const poll = async () => {
  _pollCount++;
  try {
    if (!getToken("access_token") && !getToken("refresh_token")) return;

    const current = await getCurrentlyPlaying();
    if (!current || !current.item) {
      _lastError = null;
      return;
    }

    const track = current.item;
    const trackId = track.id;

    // Check SQLite history to prevent consecutive duplicates (e.g., after server restarts)
    const lastLogged = getRecentPlays(1)[0];
    if (lastLogged && lastLogged.track_id === trackId) {
      _lastTrackId = trackId;
      return;
    }
    _lastTrackId = trackId;

    const artistName = track.artists.map((a) => a.name).join(", ");
    const albumName = track.album?.name ?? null;
    const albumArt = track.album?.images?.[0]?.url ?? null;
    const playedAt = new Date().toISOString();

    logPlay({
      track_id: trackId,
      track_name: track.name,
      artist_name: artistName,
      album_name: albumName,
      album_art: albumArt,
      played_at: playedAt,
    });
    console.log(`[logger] Logged: ${track.name} — ${artistName}`);
    _lastError = null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    _lastError = msg;
    console.error("[logger] Poll error:", msg);
  }
};

export const startLogger = (): void => {
  if (_running) return;
  _running = true;
  console.log("[logger] Starting background Spotify logger...");

  // Poll immediately, then on interval
  void poll();
  _intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);
};

export const stopLogger = (): void => {
  if (!_running) return;
  _running = false;
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  console.log("[logger] Stopped.");
};
