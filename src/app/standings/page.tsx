import type { Metadata } from "next";
import StandingsTable, {
  type StandingsColumn,
} from "@/components/standings-table";
import {
  getOverallStandings,
  getStandingsSeasons,
  getWeekStandings,
  type OverallStandingRow,
  type WeekStandingRow,
} from "@/models/standings";
import StandingsPicker from "./standings-picker";

export const metadata: Metadata = {
  title: "Standings | Sports Fans League",
};

/** Baseball-style: .745, 1.000 */
const formatPct = (row: {
  wins: number;
  losses: number;
  winPercentage: number;
}) =>
  row.wins + row.losses === 0
    ? "—"
    : row.winPercentage.toFixed(3).replace(/^0/, "");

/** Quality points are stored as floats (e.g. 39.299999); show at most 1 decimal. */
const formatPoints = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const overallColumns: readonly StandingsColumn<OverallStandingRow>[] = [
  { key: "rank", label: "", title: "Rank", align: "text-left" },
  { key: "playerName", label: "Player", title: "Player", align: "text-left" },
  { key: "wins", label: "W", title: "Wins", align: "text-center" },
  { key: "losses", label: "L", title: "Losses", align: "text-center" },
  {
    key: "winPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    format: formatPct,
  },
  {
    key: "weeklyWins",
    label: "WW",
    title: "Weekly wins",
    align: "text-center",
  },
  {
    key: "weeklyWinsWithTies",
    label: "WWT",
    title: "Weekly wins with ties",
    align: "text-center",
  },
  {
    key: "locksOfTheWeek",
    label: "LOW",
    title: "Locks of the week",
    align: "text-center",
  },
  {
    key: "topLocksOfTheWeek",
    label: "TLOW",
    title: "Top locks of the week",
    align: "text-center",
  },
  {
    key: "qualityPoints",
    label: "QP",
    title: "Quality picks",
    align: "text-center",
    format: (row) => formatPoints(row.qualityPoints),
  },
  {
    key: "difficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
  },
  {
    key: "gamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-right",
  },
];

const WEEK = "This week";
const PREV = "Previous rank";
const SEASON = "Season to date";

const weekColumns: readonly StandingsColumn<WeekStandingRow>[] = [
  { key: "rank", label: "", title: "Rank", align: "text-left" },
  { key: "playerName", label: "Player", title: "Player", align: "text-left" },
  // This week
  { key: "wins", label: "W", title: "Wins", align: "text-center", group: WEEK },
  {
    key: "losses",
    label: "L",
    title: "Losses",
    align: "text-center",
    group: WEEK,
  },
  {
    key: "winPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    group: WEEK,
    format: formatPct,
  },
  {
    key: "lockOfTheWeek",
    label: "Lock",
    title: "Lock of the week (GOW points)",
    align: "text-center",
    group: WEEK,
    format: (r) => formatPoints(r.lockOfTheWeek),
  },
  {
    key: "qualityPoints",
    label: "QP",
    title: "Quality points",
    align: "text-center",
    group: WEEK,
    format: (r) => formatPoints(r.qualityPoints),
  },
  {
    key: "difficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
    group: WEEK,
  },
  {
    key: "gamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-center",
    group: WEEK,
  },
  // Previous weeks
  {
    key: "previousWeekRank",
    label: "PWR",
    title: "Previous week's rank",
    align: "text-center",
    group: PREV,
  },
  {
    key: "previousWeekRankWithTies",
    label: "PWRT",
    title: "Previous week's rank with ties",
    align: "text-center",
    group: PREV,
  },
  {
    key: "lastPreviousWeekRank",
    label: "LPWR",
    title: "Rank two weeks ago",
    align: "text-center",
    group: PREV,
  },
  {
    key: "lastPreviousWeekRankWithTies",
    label: "LPWRT",
    title: "Rank two weeks ago with ties",
    align: "text-center",
    group: PREV,
  },
  // Season to date
  {
    key: "overallRank",
    label: "Rk",
    title: "Overall rank",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallRankWithTies",
    label: "RkT",
    title: "Overall rank with ties",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallWins",
    label: "W",
    title: "Wins",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallLosses",
    label: "L",
    title: "Losses",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallWinPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    group: SEASON,
    format: (r) =>
      formatPct({
        wins: r.overallWins,
        losses: r.overallLosses,
        winPercentage: r.overallWinPercentage,
      }),
  },
  {
    key: "weeklyWins",
    label: "WW",
    title: "Weekly wins",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "weeklyWinsWithTies",
    label: "WWT",
    title: "Weekly wins with ties",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "locksOfTheWeek",
    label: "LOW",
    title: "Locks of the week (correct locks, OGOW)",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "topLocksOfTheWeek",
    label: "TLOW",
    title: "Top locks of the week (best lock score, OGOWB)",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallQualityPoints",
    label: "QP",
    title: "Quality points",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallDifficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallGamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-right",
    group: SEASON,
  },
];

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

const toInt = (value: string | string[] | undefined) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export default async function Standings({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const seasons = await getStandingsSeasons();

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
          <StandingsPicker
            seasons={seasons}
            seasonId={season.seasonId}
            weekId={week?.weekId ?? null}
          />
        )}
      </div>

      {!season && (
        <p className="text-zinc-600 dark:text-zinc-400">No seasons yet.</p>
      )}

      {season && overall && (
        <>
          <Section title={`${season.seasonName} Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.combined} />
          </Section>
          <Section title={`${season.seasonName} College Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.college} />
          </Section>
          <Section title={`${season.seasonName} NFL Standings`}>
            <StandingsTable columns={overallColumns} rows={overall.nfl} />
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
                <StandingsTable columns={weekColumns} rows={rows} />
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
