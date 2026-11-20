import Link from "next/link";
import {
  overallColumns,
  pickColumns,
  weekColumns,
} from "@/components/standings-columns";
import StandingsTable from "@/components/standings-table";
import { formatGametime, line } from "@/lib/format";
import { getCurrentPlayer } from "@/lib/session";
import { getHomeData, type HomeGame } from "@/models/home";
import { getOverallStandings, getWeekStandings } from "@/models/standings";

// Compact versions of the Standings page tables.
const seasonColumns = pickColumns(overallColumns, [
  "rank",
  "playerName",
  "wins",
  "losses",
  "weeklyWins",
  "qualityPoints",
  "difficultyPoints",
  "gamesBehind",
]);

const homeWeekColumns = pickColumns(weekColumns, [
  "rank",
  "playerName",
  "wins",
  "losses",
  "lockOfTheWeek",
  "qualityPoints",
  "difficultyPoints",
  "gamesBehind",
]).map((col) => ({
  ...col,
  group: undefined, // no "This week" header row on the home page
  align: col.key === "gamesBehind" ? "text-right" : col.align,
}));

const sectionClass =
  "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6";

function SectionHeading({
  title,
  href,
  linkText,
}: {
  title: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-4 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}

function GameCard({ game }: { game: HomeGame }) {
  const header = game.official
    ? "Final"
    : (game.status ??
      (game.spread
        ? `Spread: ${game.favorite.name} ${line(game, "favorite")}`
        : "Pick'em"));
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-zinc-500 mb-3">
        <span>
          {game.league} · {formatGametime(game.gametime)}
        </span>
        <span className="font-semibold">{header}</span>
      </div>
      {(
        [
          { side: "favorite", picks: game.favoritePicks },
          { side: "underdog", picks: game.underdogPicks },
        ] as const
      ).map(({ side, picks }, i) => {
        const team = game[side];
        const covered =
          game.official && !game.tie && game.winnerId === team.teamId;
        return (
          <div key={side}>
            {i > 0 && (
              <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded my-2"></div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span
                  className={`font-semibold ${
                    covered
                      ? "text-green-700 dark:text-green-400"
                      : "text-black dark:text-white"
                  }`}
                >
                  {team.name}
                </span>
                <span className="ml-2 text-sm text-zinc-500">
                  {line(game, side)}
                </span>
                <div className="text-xs text-zinc-500">
                  {team.location} · {picks} {picks === 1 ? "pick" : "picks"}
                  {covered && " · Covered"}
                </div>
              </div>
              {team.score !== null && (
                <span className="text-2xl font-bold tabular-nums text-black dark:text-white">
                  {team.score}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {game.official && game.tie && (
        <p className="text-xs text-zinc-500 mt-2">Push against the spread</p>
      )}
      {game.storyline && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3">
          {game.storyline}
        </p>
      )}
    </div>
  );
}

export default async function Home() {
  const [{ season, weeks }, me] = await Promise.all([getHomeData(), getCurrentPlayer()]);
  const [overall, weekStandings] = season
    ? await Promise.all([
        getOverallStandings(season.seasonId),
        Promise.all(
          weeks.map((w) => getWeekStandings(season.seasonId, w.weekId)),
        ),
      ])
    : [null, []];

  return (
    <div className="flex-1">
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Current Games */}
          <div className="lg:col-span-2 min-w-0">
            <section className={`${sectionClass} mb-6 sm:mb-8`}>
              <SectionHeading
                title="Current Games"
                href={weeks.length ? "/view-picks" : undefined}
                linkText="View picks →"
              />
              {weeks.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  No games this week.
                </p>
              ) : (
                <div className="space-y-8">
                  {weeks.map((week) => (
                    <div key={week.weekId}>
                      <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                        {week.weekName}
                      </h3>
                      {week.games.length === 0 ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          No games scheduled yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {week.games.map((game) => (
                            <GameCard key={game.gameId} game={game} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Season Standings */}
            {season && (
              <section className={sectionClass}>
                <SectionHeading
                  title={`${season.seasonName} Standings`}
                  href="/standings"
                  linkText="Full standings →"
                />
                {overall?.combined.length ? (
                  <StandingsTable
                    columns={seasonColumns}
                    rows={overall.combined}
                    highlightPlayerId={me?.playerId}
                  />
                ) : (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No standings yet.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Weekly Standings */}
          <div className="space-y-8 min-w-0">
            {season &&
              weeks.map((week, i) => {
                const rows = weekStandings[i]?.combined ?? [];
                const hasResults = rows.some((r) => r.wins + r.losses > 0);
                return (
                  <section key={week.weekId} className={sectionClass}>
                    <SectionHeading
                      title={`${week.weekName} Standings`}
                      href={
                        hasResults
                          ? `/standings?season=${season.seasonId}&week=${week.weekId}`
                          : undefined
                      }
                      linkText="Details →"
                    />
                    {hasResults ? (
                      <StandingsTable columns={homeWeekColumns} rows={rows} highlightPlayerId={me?.playerId} />
                    ) : (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        No results yet.
                      </p>
                    )}
                  </section>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
