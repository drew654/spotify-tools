import NowPlayingPanel from "./_components/NowPlayingPanel";
import ShufflePanel from "./_components/ShufflePanel";
import LoggerControl from "./_components/LoggerControl";
import RecentPlaysPanel from "./_components/RecentPlaysPanel";
import { StatusProvider } from "./_components/StatusProvider";
import { hasCredentials } from "@/lib/spotify";
import Link from "next/link";
import { Music2 } from "lucide-react";

export const dynamic = "force-dynamic";

const DashboardPage = async () => {
  const isConnected = await hasCredentials();

  return (
    <StatusProvider>
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

        {!isConnected ? (
          /* ── Not-connected gate ── */
          <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
            <div className="bg-white/5 border border-white/8 rounded-full p-6">
              <Music2 className="w-12 h-12 text-zinc-500" />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <h2 className="text-xl font-bold text-white">
                Spotify not connected
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                You need to configure your Spotify credentials and authenticate
                before the dashboard is available.
              </p>
            </div>
            <Link
              href="/settings"
              className="btn-spotify rounded-xl px-6 py-3 text-sm font-bold"
            >
              Connect Spotify Account
            </Link>
          </div>
        ) : (
          /* ── Grid Dashboard Panels ── */
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
        )}
      </div>
    </StatusProvider>
  );
};

export default DashboardPage;
