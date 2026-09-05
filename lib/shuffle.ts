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
  stopped?: boolean;
  error?: string;
}

export interface ShuffleOptions {
  recentLimit?: number;
  maxQueue?: number | null;
  signal?: AbortSignal;
}

let _activeAbortController: AbortController | null = null;

export const stopShuffle = (): boolean => {
  if (_activeAbortController) {
    _activeAbortController.abort();
    _activeAbortController = null;
    return true;
  }
  return false;
};

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

const waitWithAbort = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      resolve();
    }, ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
};

const queueTracks = async (
  tracks: SpotifyTrack[],
  onProgress: (p: ShuffleProgress) => void,
  signal?: AbortSignal,
): Promise<ShuffleProgress> => {
  const result: ShuffleProgress = {
    total: tracks.length,
    added: 0,
    failed: 0,
    done: false,
  };

  for (const track of tracks) {
    if (signal?.aborted) {
      result.done = true;
      result.stopped = true;
      onProgress({ ...result });
      return result;
    }

    const ok = await addToQueue(track.uri);
    if (ok) result.added++;
    else result.failed++;
    onProgress({ ...result });

    await waitWithAbort(500, signal);

    if (signal?.aborted) {
      result.done = true;
      result.stopped = true;
      onProgress({ ...result });
      return result;
    }
  }

  result.done = true;
  onProgress({ ...result });
  return result;
};

export const customShuffle = async (
  recentLimitOrOptions: number | ShuffleOptions,
  onProgress: (p: ShuffleProgress) => void,
  optionalSignal?: AbortSignal,
): Promise<ShuffleProgress> => {
  let recentLimit = 50;
  let maxQueue: number | null = null;
  let callerSignal: AbortSignal | undefined = optionalSignal;

  if (typeof recentLimitOrOptions === "number") {
    recentLimit = recentLimitOrOptions;
  } else if (recentLimitOrOptions) {
    recentLimit = recentLimitOrOptions.recentLimit ?? 50;
    maxQueue = recentLimitOrOptions.maxQueue ?? null;
    callerSignal = callerSignal ?? recentLimitOrOptions.signal;
  }

  const controller = new AbortController();
  _activeAbortController = controller;

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const playlistId = await getCurrentPlaylistId();
    if (!playlistId) {
      const err =
        "No active playlist context found. Please ensure Spotify is currently playing from a playlist.";
      const result: ShuffleProgress = {
        total: 0,
        added: 0,
        failed: 0,
        done: true,
        error: err,
      };
      onProgress(result);
      return result;
    }

    const [allTracks, recentIds] = await Promise.all([
      getPlaylistTracks(playlistId),
      Promise.resolve(getRecentTrackIds(recentLimit)),
    ]);

    if (controller.signal.aborted) {
      const result: ShuffleProgress = {
        total: 0,
        added: 0,
        failed: 0,
        done: true,
        stopped: true,
      };
      onProgress(result);
      return result;
    }

    if (allTracks.length === 0) {
      const err = `No tracks could be retrieved for playlist (ID: ${playlistId}). Please ensure this playlist contains playable tracks.`;
      const result: ShuffleProgress = {
        total: 0,
        added: 0,
        failed: 0,
        done: true,
        error: err,
      };
      onProgress(result);
      return result;
    }

    const excludedIds = new Set(recentIds);
    const filtered = allTracks.filter((t) => !excludedIds.has(t.id));
    const tracksToShuffle = filtered.length > 0 ? filtered : allTracks;
    let shuffled = shuffle(tracksToShuffle);

    if (typeof maxQueue === "number" && maxQueue > 0) {
      shuffled = shuffled.slice(0, maxQueue);
    }

    console.log(
      `[shuffle] Smart Shuffle: ${allTracks.length} total, queuing ${shuffled.length} tracks (excluded ${recentLimit} recent, maxQueue: ${maxQueue ?? "none"})...`,
    );

    return await queueTracks(shuffled, onProgress, controller.signal);
  } finally {
    if (_activeAbortController === controller) {
      _activeAbortController = null;
    }
  }
};
