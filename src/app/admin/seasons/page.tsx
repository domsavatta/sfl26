import type { Metadata } from "next";
import { addSeason, setCurrentSeason } from "@/app/actions/admin-seasons";
import ScrollX from "@/components/scroll-x";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { nextSeasonName } from "@/lib/season-form";
import { getSession } from "@/lib/session";
import { getSeasons } from "@/models/admin-seasons";
import AdminOnly from "../admin-message";
import AdminNav from "../admin-nav";
import MakeCurrent from "./make-current";
import SeasonForm from "./season-form";

export const metadata: Metadata = {
  title: "Seasons | Admin | Sports Fans League",
};

const sectionClass =
  "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6";

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminOnly session={await getSession()} next="/admin/seasons" />
      </main>
    );
  }

  const seasons = await getSeasons();
  const current = seasons.find((s) => s.current) ?? null;
  const addedId = toInt(query.added);
  const madeCurrentId = toInt(query.current);
  const added = seasons.find((s) => s.seasonId === addedId);
  const madeCurrent = seasons.find((s) => s.seasonId === madeCurrentId);
  const highlightId = added?.seasonId ?? madeCurrent?.seasonId;
  const message = added
    ? `Added the ${added.name}${added.current ? " and made it the current season" : ""}.`
    : madeCurrent
      ? `The ${madeCurrent.name} is now the current season.`
      : null;

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Admin</h1>
        <AdminNav current="seasons" />
      </div>

      <section className={sectionClass} aria-labelledby="seasons-heading">
        <h2 id="seasons-heading" className="mb-1 text-lg font-semibold text-black dark:text-white">
          Seasons
        </h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          The current season is the one Make Picks, the home page and the admin
          weeks list use.
        </p>
        {message && (
          <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">
            {message}
          </p>
        )}
        <ScrollX>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="py-2 pr-2 font-medium">Season</th>
                {/* Hidden on phones so the Make current buttons fit. */}
                <th className="hidden sm:table-cell py-2 px-2 font-medium text-right">Weeks</th>
                <th className="py-2 px-2 font-medium text-right">Players</th>
                <th className="py-2 pl-2 font-medium text-right">
                  <span className="sr-only">Current</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr
                  key={s.seasonId}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${
                    s.seasonId === highlightId ? "bg-green-50 dark:bg-green-950/40" : ""
                  }`}
                >
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <span className="font-medium text-black dark:text-white">{s.name}</span>
                    {!s.active && (
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">Hidden</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell py-2 px-2 text-right tabular-nums">{s.weeks}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{s.players}</td>
                  <td className="py-2 pl-2 text-right">
                    {s.current ? (
                      <span className="inline-block rounded-full bg-green-100 dark:bg-green-950 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                        Current
                      </span>
                    ) : (
                      <MakeCurrent
                        action={setCurrentSeason.bind(null, s.seasonId)}
                        seasonName={s.name}
                        currentName={current?.name ?? null}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </section>

      <section className={sectionClass} aria-labelledby="add-season-heading">
        <h2 id="add-season-heading" className="mb-4 text-lg font-semibold text-black dark:text-white">
          Add a season
        </h2>
        <SeasonForm
          key={seasons.length}
          action={addSeason}
          initialName={nextSeasonName(seasons[0]?.name, new Date().getFullYear())}
        />
      </section>
    </main>
  );
}
