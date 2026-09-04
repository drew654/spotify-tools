"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface NowPlaying {
  id: string;
  name: string;
  artists: string[];
  albumName: string | null;
  albumArt: string | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
}

export interface PlaylistDetails {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  totalTracks: number;
  externalUrl: string | null;
}

export interface CurrentContext {
  type: string;
  uri: string;
  playlist: PlaylistDetails | null;
}

export interface StatusResponse {
  running: boolean;
  lastError: string | null;
  pollCount: number;
  nowPlaying: NowPlaying | null;
  currentContext: CurrentContext | null;
  totalLogged: number;
}

interface StatusContextValue {
  status: StatusResponse | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  setStatus: React.Dispatch<React.SetStateAction<StatusResponse | null>>;
}

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = (await res.json()) as StatusResponse;
        setStatus(json);
      }
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchStatus();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    void fetchStatus();
    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchStatus();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleFocus = () => {
      void fetchStatus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchStatus, startPolling, stopPolling]);

  return (
    <StatusContext.Provider value={{ status, loading, refreshStatus: fetchStatus, setStatus }}>
      {children}
    </StatusContext.Provider>
  );
};

export const useStatus = (): StatusContextValue => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return context;
};
