import type { Metadata } from "next";
import Link from "next/link";
import ScrollX from "@/components/scroll-x";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getCurrentSeasonName, getPlayers } from "@/models/admin-players";
import AdminOnly from "../admin-message";
import AdminNav from "../admin-nav";

export const metadata: Metadata = {
  title: "Players | Admin | Sports Fans League",
};

const Check = ({ on, label }: { on: boolean; label: string }) =>
  on ? (
    <span className="font-semibold text-green-700 dark:text-green-400" aria-label={label}>✓</span>
  ) : (
    <span className="text-zinc-400 dark:text-zinc-600" aria-label={`Not ${label.toLowerCase()}`}>—</span>
  );

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminOnly session={await getSession()} next="/admin/players" />
      </main>
    );
  }

  const [players, seasonName] = await Promise.all([getPlayers(), getCurrentSeasonName()]);
  const savedId = toInt(query.saved);
  const saved = players.find((p) => p.playerId === savedId);
  const seasonCount = players.filter((p) => p.inSeason).length;
  const view =
    query.view === "all" || (saved && !saved.inSeason) || !seasonCount ? "all" : "season";
  const shown = view === "all" ? players : players.filter((p) => p.inSeason);
  const tabs = [
    { key: "season", label: seasonName ?? "This season", count: seasonCount },
    { key: "all", label: "All players", count: players.length },
  ];

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminNav current="players" />
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Players</h2>
          <Link
            href="/admin/players/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add player
          </Link>
        </div>

        {(saved || query.deleted === "1") && (
          <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">
            {saved ? `Saved ${saved.name}.` : "Player deleted."}
          </p>
        )}

        <nav aria-label="Players shown" className="mb-3 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/players?view=all" : "/admin/players"}
              scroll={false}
              aria-current={t.key === view ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                t.key === view
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {t.label} <span className="font-normal text-zinc-500">({t.count})</span>
            </Link>
          ))}
        </nav>

        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Select a player to edit them.</p>
        <ScrollX>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-2 font-medium">Player</th>
                <th className="hidden sm:table-cell py-2 px-2 font-medium">Full name</th>
                {view === "all" && <th className="py-2 px-2 font-medium text-center">Season</th>}
                <th className="py-2 px-2 font-medium text-center">Admin</th>
                <th className="py-2 pl-2 font-medium text-center">Hidden</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr
                  key={p.playerId}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${
                    p.playerId === savedId ? "bg-green-50 dark:bg-green-950/40" : ""
                  }`}
                >
                  <td className="py-2 pr-2">
                    <Link
                      href={`/admin/players/${p.playerId}`}
                      className={`font-medium hover:underline ${
                        p.hidden ? "text-zinc-500" : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell py-2 px-2 text-zinc-600 dark:text-zinc-400">
                    {[p.firstName, p.lastName].filter(Boolean).join(" ")}
                  </td>
                  {view === "all" && (
                    <td className="py-2 px-2 text-center">
                      <Check on={p.inSeason} label="In season" />
                    </td>
                  )}
                  <td className="py-2 px-2 text-center">
                    <Check on={p.admin} label="Admin" />
                  </td>
                  <td className="py-2 pl-2 text-center">
                    <Check on={p.hidden} label="Hidden" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </section>
    </main>
  );
}
