import { getToken, saveToken } from './db';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';

// ─── Token management ─────────────────────────────────────────────────────────

const getClientId = (): string => {
  return process.env.SPOTIFY_CLIENT_ID ?? '';
}

const getClientSecret = (): string => {
  return process.env.SPOTIFY_CLIENT_SECRET ?? '';
}

export const getRedirectUri = (): string => {
  return process.env.SPOTIFY_REDIRECT_URI ?? 'http://localhost:3000/api/auth/callback';
}

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getToken('refresh_token');
  if (!refreshToken) return null;

  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error('[spotify] Token refresh failed:', res.status, await res.text());
    return null;
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000;
  saveToken('access_token', data.access_token);
  saveToken('expires_at', String(expiresAt));
  if (data.refresh_token) {
    saveToken('refresh_token', data.refresh_token);
  }

  return data.access_token;
}

export const getValidAccessToken = async (): Promise<string | null> => {
  let accessToken = getToken('access_token');
  const expiresAt = Number(getToken('expires_at') ?? '0');

  if (!accessToken || Date.now() > expiresAt - 60_000) {
    accessToken = await refreshAccessToken();
  }

  return accessToken;
}

const _endpointCooldowns = new Map<string, number>();

const getRouteKey = (endpoint: string): string => {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const parts = clean.split('/');
  if (parts[0] === 'me' && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] || 'default';
};

const spotifyFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> => {
  const routeKey = getRouteKey(endpoint);
  const cooldownUntil = _endpointCooldowns.get(routeKey) ?? 0;

  if (Date.now() < cooldownUntil) {
    return null;
  }

  const token = await getValidAccessToken();
  if (!token) return null;

  const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 10;
      const cooldownSec = Math.min(isNaN(retryAfterSec) ? 10 : Math.max(retryAfterSec, 5), 60);
      _endpointCooldowns.set(routeKey, Date.now() + cooldownSec * 1000);
      console.warn(`[spotify] Rate limit 429 encountered on [${routeKey}]. Backing off that route for ${cooldownSec}s.`);
    }
    console.error(`[spotify] ${options.method ?? 'GET'} ${endpoint} → ${res.status}:`, errorBody);
    return null;
  }

  return res.json() as Promise<T>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
}

export interface CurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack | null;
  context: {
    type: string;
    uri: string;
  } | null;
  progress_ms: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

let _lastKnownPlayback: { data: CurrentlyPlaying | null; timestamp: number } | null = null;

export const getCurrentlyPlaying = async (): Promise<CurrentlyPlaying | null> => {
  const result = await spotifyFetch<CurrentlyPlaying>('/me/player/currently-playing');
  if (result !== null) {
    _lastKnownPlayback = { data: result, timestamp: Date.now() };
    return result;
  }
  if (_lastKnownPlayback && Date.now() - _lastKnownPlayback.timestamp < 30_000) {
    return _lastKnownPlayback.data;
  }
  return null;
};

export const getRecentlyPlayed = async (limit = 50): Promise<SpotifyTrack[]> => {
  const data = await spotifyFetch<{ items: { track: SpotifyTrack }[]; next: string | null }>(
    `/me/player/recently-played?limit=${limit}`
  );
  if (!data) return [];

  const tracks: SpotifyTrack[] = data.items.map(i => i.track);

  // Paginate if needed
  let cursor = data;
  while (cursor.next) {
    const nextUrl = cursor.next.replace(SPOTIFY_API, '');
    const nextData = await spotifyFetch<typeof cursor>(nextUrl);
    if (!nextData) break;
    tracks.push(...nextData.items.map(i => i.track));
    cursor = nextData;
  }

  return tracks;
};

export const getTopTracks = async (limit = 50): Promise<SpotifyTrack[]> => {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=short_term&limit=${limit}`
  );
  return data?.items ?? [];
};

export const getPlaylistTracks = async (playlistId: string): Promise<SpotifyTrack[]> => {
  const cleanId = playlistId.split('?')[0];
  const allPlaylistTracks: SpotifyTrack[] = [];

  const playlist: any = await spotifyFetch(`/playlists/${cleanId}`);
  let playlistItems = playlist?.items ?? playlist?.tracks ?? null;

  if (!playlistItems) {
    playlistItems = await spotifyFetch(`/playlists/${cleanId}/items?limit=50`);
  }

  while (playlistItems) {
    const items = playlistItems.items ?? [];
    for (const wrapper of items) {
      const t = wrapper?.item ?? (wrapper?.id && wrapper?.uri ? wrapper : null);
      if (t && (t.type === 'track' || t.uri?.startsWith('spotify:track:'))) {
        allPlaylistTracks.push({
          id: t.id,
          name: t.name,
          uri: t.uri,
          artists: Array.isArray(t.artists) ? t.artists : [],
          album: t.album ?? { name: '', images: [] },
          duration_ms: t.duration_ms ?? 0,
        });
      }
    }

    if (playlistItems.next) {
      const nextPath = playlistItems.next.replace(SPOTIFY_API, '');
      playlistItems = await spotifyFetch(nextPath);
    } else {
      break;
    }
  }

  return allPlaylistTracks;
};

export interface SpotifyPlaylistDetails {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  totalTracks: number;
  externalUrl: string | null;
}

const PLAYLIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _playlistCache = new Map<string, { data: SpotifyPlaylistDetails | null; expiresAt: number }>();

export const getPlaylistDetails = async (playlistId: string): Promise<SpotifyPlaylistDetails | null> => {
  const cleanId = playlistId.split('?')[0];
  const cached = _playlistCache.get(cleanId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await spotifyFetch<any>(`/playlists/${cleanId}`);
  if (!data) {
    _playlistCache.set(cleanId, {
      data: cached?.data ?? null,
      expiresAt: Date.now() + PLAYLIST_CACHE_TTL_MS,
    });
    return cached?.data ?? null;
  }

  const total = data.items?.total ?? data.tracks?.total ?? (data.items?.items?.length ?? 0);

  const details: SpotifyPlaylistDetails = {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    imageUrl: data.images?.[0]?.url ?? null,
    ownerName: data.owner?.display_name ?? null,
    totalTracks: total,
    externalUrl: data.external_urls?.spotify ?? `https://open.spotify.com/playlist/${cleanId}`,
  };

  _playlistCache.set(cleanId, {
    data: details,
    expiresAt: Date.now() + PLAYLIST_CACHE_TTL_MS,
  });

  return details;
};

export const addToQueue = async (trackUri: string): Promise<boolean> => {
  const token = await getValidAccessToken();
  if (!token) return false;

  const res = await fetch(`${SPOTIFY_API}/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok || res.status === 204;
}

export const hasCredentials = async (): Promise<boolean> => {
  return !!(getClientId() && getClientSecret() && getToken('refresh_token'));
}

export const buildAuthUrl = (state: string): string => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-recently-played',
    'user-top-read',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: scopes,
    state,
    show_dialog: 'true',
  });

  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string): Promise<boolean> => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    console.error('[spotify] Token exchange failed:', await res.text());
    return false;
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000;
  saveToken('access_token', data.access_token);
  saveToken('refresh_token', data.refresh_token);
  saveToken('expires_at', String(expiresAt));

  return true;
}
