import NowPlayingPanel from "./_components/NowPlayingPanel";
import ShufflePanel from "./_components/ShufflePanel";
import LoggerControl from "./_components/LoggerControl";
import RecentPlaysPanel from "./_components/RecentPlaysPanel";
import { hasCredentials } from "@/lib/spotify";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const DashboardPage = async () => {
  const isConnected = await hasCredentials();

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          System Dashboard
        </h1>
        <p className="text-zinc-400 text-sm">
          Monitor track activity logs, trigger custom smart shuffles, and review
          stats.
        </p>
      </div>

      {/* Warning banner if credentials are not configured */}
      {!isConnected && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-4">
            <div className="bg-amber-500/10 p-3 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-white font-semibold">
                Spotify is not connected
              </h4>
              <p className="text-zinc-400 text-xs mt-1">
                You must configure your client ID, secret, and authenticate
                before the system can track logs or shuffle.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="btn-spotify rounded-xl px-5 py-2.5 text-sm font-semibold shrink-0"
          >
            Setup Credentials
          </Link>
        </div>
      )}

      {/* Grid Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="flex flex-col gap-8">
          <NowPlayingPanel />
          <LoggerControl />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-8">
          <ShufflePanel />
          <RecentPlaysPanel />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
