import { getRecentPlays, getTotalPlayCount } from "@/lib/db";
import Link from "next/link";
import { History } from "lucide-react";

interface HistoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

const HistoryPage = async ({ searchParams }: HistoryPageProps) => {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(String(resolvedParams.page ?? "1"), 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(String(resolvedParams.limit ?? "50"), 10)),
  );
  const offset = (page - 1) * limit;

  const plays = getRecentPlays(limit, offset);
  const total = getTotalPlayCount();
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Logged Play History
        </h1>
        <p className="text-zinc-400 text-sm">
          A persistent archive of all tracks played since the logger was
          configured.
        </p>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 bg-white/3">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-black/25">
                <th className="py-4 px-6 w-16"></th>
                <th className="py-4 px-6">Title</th>
                <th className="py-4 px-6">Artist</th>
                <th className="py-4 px-6">Album</th>
                <th className="py-4 px-6 text-right">Played At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {plays.length > 0 ? (
                plays.map((play, idx) => (
                  <tr
                    key={play.id}
                    className="hover:bg-white/2 transition-colors text-sm group"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-zinc-600">
                      {offset + idx + 1}
                    </td>
                    <td className="py-4 px-6 font-medium text-white truncate max-w-[200px]">
                      <div className="flex items-center gap-3">
                        {play.album_art && (
                          <img
                            src={play.album_art}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-zinc-800 flex-shrink-0"
                          />
                        )}
                        <span className="truncate group-hover:text-spotify-green transition-colors">
                          {play.track_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-300 truncate max-w-[150px]">
                      {play.artist_name}
                    </td>
                    <td className="py-4 px-6 text-zinc-400 truncate max-w-[150px] italic">
                      {play.album_name ?? "—"}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-zinc-500 text-xs">
                      {new Date(play.played_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-zinc-600" />
                      <span>No logged track history.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 bg-black/10">
            <span className="text-xs text-zinc-400">
              Showing{" "}
              <span className="font-semibold text-white">{offset + 1}</span> to{" "}
              <span className="font-semibold text-white">
                {Math.min(offset + limit, total)}
              </span>{" "}
              of <span className="font-semibold text-white">{total}</span>{" "}
              records
            </span>

            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={`/history?page=${page - 1}&limit=${limit}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-all"
                >
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 opacity-40 text-zinc-500 text-xs font-medium cursor-not-allowed">
                  Previous
                </span>
              )}

              <span className="text-xs text-zinc-400 font-mono">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={`/history?page=${page + 1}&limit=${limit}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-all"
                >
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 opacity-40 text-zinc-500 text-xs font-medium cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
