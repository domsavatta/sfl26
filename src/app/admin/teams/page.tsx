import type { Metadata } from "next";
import Link from "next/link";
import ScrollX from "@/components/scroll-x";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getAllTeams, LEAGUES } from "@/models/admin-teams";
import AdminOnly from "../admin-message";
import AdminNav from "../admin-nav";

export const metadata: Metadata = {
  title: "Teams | Admin | Sports Fans League",
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminOnly session={await getSession()} next="/admin/teams" />
      </main>
    );
  }

  const teams = await getAllTeams();
  const savedId = toInt(query.saved);
  const saved = teams.find((t) => t.teamId === savedId);
  // Show the saved team's league, else the chosen one, else the first.
  const league =
    saved?.league ??
    LEAGUES.find((l) => l === query.league) ??
    LEAGUES[0];
  const shown = teams.filter((t) => t.league === league);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminNav current="teams" />
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Teams</h2>
          <Link
            href="/admin/teams/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add team
          </Link>
        </div>

        {(saved || query.deleted === "1") && (
          <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">
            {saved ? `Saved ${saved.name}.` : "Team deleted."}
          </p>
        )}

        <nav aria-label="League" className="mb-3 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {LEAGUES.map((l) => {
            const count = teams.filter((t) => t.league === l).length;
            return (
              <Link
                key={l}
                href={`/admin/teams?league=${l}`}
                scroll={false}
                aria-current={l === league ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  l === league
                    ? "border-black text-black dark:border-white dark:text-white"
                    : "border-transparent text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {l} <span className="font-normal text-zinc-500">({count})</span>
              </Link>
            );
          })}
        </nav>

        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Select a team to edit it.</p>
        <ScrollX>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-2 font-medium">Team</th>
                <th className="py-2 px-2 font-medium">Abbr.</th>
                <th className="py-2 px-2 font-medium text-right">Games</th>
                <th className="py-2 pl-2 font-medium text-center">Active</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((team) => (
                <tr
                  key={team.teamId}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${
                    team.teamId === savedId ? "bg-green-50 dark:bg-green-950/40" : ""
                  }`}
                >
                  <td className="py-2 pr-2">
                    <Link
                      href={`/admin/teams/${team.teamId}`}
                      className={`font-medium hover:underline ${
                        team.active
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-500 dark:text-zinc-500"
                      }`}
                    >
                      {team.name}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">
                    {team.abbreviation ?? ""}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{team.games}</td>
                  <td className="py-2 pl-2 text-center">
                    {team.active ? (
                      <span className="font-semibold text-green-700 dark:text-green-400" aria-label="Active">✓</span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600" aria-label="Inactive">—</span>
                    )}
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
