import type { Metadata } from "next";
import SeasonWeekPicker from "@/components/season-week-picker";
import {
  overallColumns,
  weekColumns,
} from "@/components/standings-columns";
import StandingsTable, {
  type StandingsColumn,
} from "@/components/standings-table";
import { toInt } from "@/lib/format";
import { getCurrentPlayer } from "@/lib/session";
import {
  getOverallStandings,
  getStandingsSeasons,
  getWeekStandings,
} from "@/models/standings";

export const metadata: Metadata = {
  title: "Standings | Sports Fans League",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-3 sm:mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Abbreviation key; headers have tooltips, but phones can't hover. */
function Legend<T>({ columns }: { columns: readonly StandingsColumn<T>[] }) {
  // One entry per abbreviation (e.g. QP appears under "This week" and "Season to date").
  const abbreviated = columns.filter(
    (c, i) =>
      c.label &&
      c.label !== c.title &&
      columns.findIndex((o) => o.label === c.label) === i,
  );
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      {abbreviated.map((c) => (
        <div key={c.key} className="flex gap-1">
          <dt className="font-semibold">{c.label}</dt>
          <dd>{c.title.replace(/ \(.*\)$/, "")}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function Standings({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [seasons, me] = await Promise.all([getStandingsSeasons(), getCurrentPlayer()]);
  const highlightPlayerId = me?.playerId;

  // Default: current season, overall. Unknown ids fall back the same way.
  const season =
    seasons.find((s) => s.seasonId === toInt(params.season)) ??
    seasons.find((s) => s.isCurrent) ??
    seasons[0];
  const requestedWeek = toInt(params.week);
  const week = season?.weeks.find((w) => w.weekId === requestedWeek) ?? null;

  const overall =
    season && !week ? await getOverallStandings(season.seasonId) : null;
  const weekStandings =
    season && week
      ? await getWeekStandings(season.seasonId, week.weekId)
      : null;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="sm:flex sm:items-end sm:justify-between gap-4 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Standings
        </h1>
        {season && (
          <SeasonWeekPicker
            action="/standings"
            seasons={seasons}
            seasonId={season.seasonId}
            weekId={week?.weekId ?? null}
            weekLabel="Standings"
            allWeeksLabel="Overall"
          />
        )}
      </div>

      {!season && (
        <p className="text-zinc-600 dark:text-zinc-400">No seasons yet.</p>
      )}

      {season && overall && (
        <>
          <Section title={`${season.seasonName} Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.combined} highlightPlayerId={highlightPlayerId} />
          </Section>
          <Section title={`${season.seasonName} College Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.college} highlightPlayerId={highlightPlayerId} />
          </Section>
          <Section title={`${season.seasonName} NFL Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.nfl} highlightPlayerId={highlightPlayerId} />
          </Section>
          <Legend columns={overallColumns} />
        </>
      )}

      {season && week && weekStandings && (
        <>
          {(
            [
              ["", "", weekStandings.combined],
              ["College ", "college", weekStandings.college],
              ["NFL ", "NFL", weekStandings.nfl],
            ] as const
          ).map(([label, league, rows]) => (
            <Section
              key={label || "combined"}
              title={`${season.seasonName} ${week.weekName} ${label}Standings`}
            >
              {/* A league with no official games this week has only 0-0 rows
                  (and miscounted weekly wins), so don't show a table. */}
              {rows.some((r) => r.wins + r.losses > 0) ? (
                <StandingsTable columns={weekColumns} rows={rows} highlightPlayerId={highlightPlayerId} />
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No official {league ? `${league} ` : ""}games this week.
                </p>
              )}
            </Section>
          ))}
          <Legend columns={weekColumns} />
        </>
      )}
    </main>
  );
}
