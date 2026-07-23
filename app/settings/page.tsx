"use client";

import { useState, useEffect, use } from "react";
import { AlertTriangle } from "lucide-react";

interface SettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SettingsPage = ({ searchParams }: SettingsPageProps) => {
  const params = use(searchParams);
  const errorParam = params.error ? String(params.error) : null;

  const [isConnected, setIsConnected] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(
    errorParam
      ? { type: "error", text: `Authentication error: ${errorParam}` }
      : null,
  );

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const settings = (await res.json()) as {
          envConfigured: boolean;
          isConnected: boolean;
        };
        setEnvConfigured(settings.envConfigured);
        setIsConnected(settings.isConnected);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-white/10 rounded" />
        <div className="h-48 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          System Connection
        </h1>
        <p className="text-zinc-400 text-sm">
          Authenticate and monitor your Spotify account connection.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl text-sm border bg-red-950/20 border-red-500/30 text-red-400">
          {statusMessage.text}
        </div>
      )}

      {/* Env Credentials configuration warning */}
      {!envConfigured && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 flex gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl flex items-center justify-center text-amber-500 shrink-0 h-12 w-12">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h4 className="text-white font-semibold">
              Environment Variables Missing
            </h4>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Spotify Client ID and Client Secret must be configured in your
              environment. Please add{" "}
              <code className="text-amber-400 font-mono">
                SPOTIFY_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="text-amber-400 font-mono">
                SPOTIFY_CLIENT_SECRET
              </code>{" "}
              to your <code className="text-white font-mono">.env.local</code>{" "}
              file and restart the Next.js server.
            </p>
          </div>
        </div>
      )}

      {/* Spotify Authentication Connection Card */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 border-l-4 border-l-spotify-green">
        <h3 className="text-base font-bold text-white">
          Spotify Account Connection
        </h3>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Link your account to enable play tracking and smart-shuffling. You
          will be redirected to Spotify to log in and confirm permissions.
        </p>

        <div className="flex items-center gap-4 mt-2">
          {envConfigured ? (
            <a
              href="/api/auth/login"
              className="btn-spotify rounded-xl py-3 px-6 text-center font-bold text-sm inline-block cursor-pointer"
            >
              Connect Spotify Account
            </a>
          ) : (
            <span className="bg-zinc-800 text-zinc-500 rounded-xl py-3 px-6 text-center font-bold text-sm inline-block cursor-not-allowed opacity-50">
              Connect Spotify Account
            </span>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-spotify-green" : "bg-zinc-600"}`}
            />
            <span className="text-zinc-300">
              {isConnected ? "Linked to Spotify" : "Not authorized yet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
