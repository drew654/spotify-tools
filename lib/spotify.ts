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

// ─── Spotify API client ───────────────────────────────────────────────────────

const spotifyFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> => {
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
    console.error(`[spotify] ${options.method ?? 'GET'} ${endpoint} → ${res.status}`);
    return null;
  }

  return res.json() as Promise<T>;
}

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

export const getCurrentlyPlaying = async (): Promise<CurrentlyPlaying | null> => {
  return spotifyFetch<CurrentlyPlaying>('/me/player/currently-playing');
}

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
}

export const getTopTracks = async (limit = 50): Promise<SpotifyTrack[]> => {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=short_term&limit=${limit}`
  );
  return data?.items ?? [];
}

export const getPlaylistTracks = async (playlistId: string): Promise<SpotifyTrack[]> => {
  const tracks: SpotifyTrack[] = [];
  let url: string | null = `/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const data: any = await spotifyFetch<{
      items: { track: SpotifyTrack | null }[];
      next: string | null;
    }>(url);
    if (!data) break;

    for (const item of data.items) {
      if (item.track) tracks.push(item.track);
    }
    url = data.next ? data.next.replace(SPOTIFY_API, '') : null;
  }

  return tracks;
}

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
  });

  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

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
