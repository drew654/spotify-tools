import {
  getCurrentlyPlaying,
  getPlaylistTracks,
  addToQueue,
  type SpotifyTrack,
} from "./spotify";
import { getRecentTrackIds } from "./db";

export interface ShuffleProgress {
  total: number;
  added: number;
  failed: number;
  done: boolean;
  error?: string;
}

const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getCurrentPlaylistId = async (): Promise<string | null> => {
  const current = await getCurrentlyPlaying();
  if (!current?.context) return null;
  if (current.context.type !== "playlist") return null;
  const parts = current.context.uri.split(":");
  return parts[parts.length - 1];
};

const queueTracks = async (
  tracks: SpotifyTrack[],
  onProgress: (p: ShuffleProgress) => void,
): Promise<ShuffleProgress> => {
  const result: ShuffleProgress = {
    total: tracks.length,
    added: 0,
    failed: 0,
    done: false,
  };

  for (const track of tracks) {
    const ok = await addToQueue(track.uri);
    if (ok) result.added++;
    else result.failed++;
    onProgress({ ...result });
    await new Promise((r) => setTimeout(r, 500));
  }

  result.done = true;
  onProgress({ ...result });
  return result;
};

export const customShuffle = async (
  recentLimit: number,
  onProgress: (p: ShuffleProgress) => void,
): Promise<ShuffleProgress> => {
  const playlistId = await getCurrentPlaylistId();
  if (!playlistId) {
    const err = "No active playlist context found. Please ensure Spotify is currently playing from a playlist.";
    const result = { total: 0, added: 0, failed: 0, done: true, error: err };
    onProgress(result);
    return result;
  }

  const [allTracks, recentIds] = await Promise.all([
    getPlaylistTracks(playlistId),
    Promise.resolve(getRecentTrackIds(recentLimit)),
  ]);

  if (allTracks.length === 0) {
    const err = `No tracks could be retrieved for playlist (ID: ${playlistId}). Please ensure this playlist contains playable tracks.`;
    const result = { total: 0, added: 0, failed: 0, done: true, error: err };
    onProgress(result);
    return result;
  }

  const excludedIds = new Set(recentIds);
  const filtered = allTracks.filter((t) => !excludedIds.has(t.id));
  const tracksToShuffle = filtered.length > 0 ? filtered : allTracks;
  const shuffled = shuffle(tracksToShuffle);

  console.log(
    `[shuffle] Smart Shuffle: ${allTracks.length} total, ${shuffled.length} queued after excluding ${recentLimit} recent, queuing...`,
  );
  return queueTracks(shuffled, onProgress);
};
