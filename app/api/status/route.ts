import { getLoggerStatus } from '@/lib/logger';
import { getCurrentlyPlaying, getPlaylistDetails } from '@/lib/spotify';
import { getTotalPlayCount } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export const GET = async () => {
  const loggerStatus = getLoggerStatus();
  const [nowPlaying, totalLogged] = await Promise.all([
    getCurrentlyPlaying().catch(() => null),
    Promise.resolve(getTotalPlayCount()),
  ]);

  let playlistDetails = null;
  if (nowPlaying?.context?.type === 'playlist') {
    const parts = nowPlaying.context.uri.split(':');
    const playlistId = parts[parts.length - 1];
    if (playlistId) {
      playlistDetails = await getPlaylistDetails(playlistId).catch(() => null);
    }
  }

  return NextResponse.json({
    ...loggerStatus,
    nowPlaying: nowPlaying?.item
      ? {
          id: nowPlaying.item.id,
          name: nowPlaying.item.name,
          artists: nowPlaying.item.artists.map(a => a.name),
          albumName: nowPlaying.item.album?.name ?? null,
          albumArt: nowPlaying.item.album?.images?.[0]?.url ?? null,
          isPlaying: nowPlaying.is_playing,
          progressMs: nowPlaying.progress_ms,
          durationMs: nowPlaying.item.duration_ms,
        }
      : null,
    currentContext: nowPlaying?.context
      ? {
          type: nowPlaying.context.type,
          uri: nowPlaying.context.uri,
          playlist: playlistDetails,
        }
      : null,
    totalLogged,
  });
};
