import type { Metadata } from "next";
import Link from "next/link";
import SeasonWeekPicker from "@/components/season-week-picker";
import {
  getPicksSeasons,
  getWeekPicks,
  PICKS_SORTS,
  sortPlayers,
  type PicksGame,
  type PicksSort,
} from "@/models/picks";
import { formatGametime, line, toInt } from "@/lib/format";
import PicksGrid from "./picks-grid";

export const metadata: Metadata = {
  title: "View Picks | Sports Fans League",
};

const sortLabels: Record<PicksSort, string> = {
  overall: "Overall rank",
  week: "Weekly rank",
  name: "Player",
};

/** Sort links; plain links so the sort is in the URL and works without JS. */
function SortLinks({
  sort,
  seasonId,
  weekId,
}: {
  sort: PicksSort;
  seasonId: number;
  weekId: number;
}) {
  return (
    <nav aria-label="Sort players" className="flex items-center gap-2 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">Sort by</span>
      <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden">
        {PICKS_SORTS.map((s) => (
          <Link
            key={s}
            href={`/view-picks?season=${seasonId}&week=${weekId}${s === "overall" ? "" : `&sort=${s}`}`}
            scroll={false}
            aria-current={s === sort ? "true" : undefined}
            className={`px-2.5 sm:px-3 py-1.5 border-l first:border-l-0 border-zinc-300 dark:border-zinc-700 ${
              s === sort
                ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-medium"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {sortLabels[s]}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function GameCard({ game, number }: { game: PicksGame; number: number }) {
  const status = game.status ?? (game.official ? "Final" : null);
  return (
    <li className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
        <span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {number}
          </span>{" "}
          · {game.league} · {formatGametime(game.gametime)}
        </span>
        {status && <span className="font-semibold">{status}</span>}
      </div>
      {(["favorite", "underdog"] as const).map((side) => {
        const team = game[side];
        const covered =
          game.official && !game.tie && game.winnerId === team.teamId;
        return (
          <div
            key={side}
            className={`flex items-center justify-between gap-2 py-0.5 ${
              covered
                ? "font-semibold text-green-800 dark:text-green-300"
                : "text-black dark:text-white"
            }`}
          >
            <span className="truncate">
              {team.name}{" "}
              <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                {line(game, side)} · {team.location}
              </span>
            </span>
            <span className="tabular-nums">{team.score ?? ""}</span>
          </div>
        );
      })}
      {game.official && game.tie && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Push against the spread
        </p>
      )}
      {game.storyline && (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {game.storyline}
        </p>
      )}
    </li>
  );
}

export default async function ViewPicks({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const seasons = await getPicksSeasons();

  // Default: current season's latest live week. Unknown ids fall back the same way.
  const season =
    seasons.find((s) => s.seasonId === toInt(params.season)) ??
    seasons.find((s) => s.isCurrent) ??
    seasons[0];
  const week =
    season?.weeks.find((w) => w.weekId === toInt(params.week)) ??
    season?.weeks.at(-1);

  const data =
    season && week ? await getWeekPicks(season.seasonId, week.weekId) : null;
  const anyStarted = data?.games.some((g) => g.started) ?? false;
  const sortParam = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: PicksSort = PICKS_SORTS.find((s) => s === sortParam) ?? "overall";
  const players = data ? sortPlayers(data.players, sort) : [];

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="sm:flex sm:items-end sm:justify-between gap-4 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          View Picks
        </h1>
        {season && week && (
          <SeasonWeekPicker
            action="/view-picks"
            seasons={seasons}
            seasonId={season.seasonId}
            weekId={week.weekId}
            hidden={sort === "overall" ? {} : { sort }}
          />
        )}
      </div>

      {!data && (
        <p className="text-zinc-600 dark:text-zinc-400">No games yet.</p>
      )}

      {season && week && data && (
        <>
          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-3 sm:mb-4">
              {season.seasonName} {week.weekName} Games
            </h2>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.games.map((g, i) => (
                <GameCard key={g.gameId} game={g} number={i + 1} />
              ))}
            </ol>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-1">
              {season.seasonName} {week.weekName} Picks
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4">
              {anyStarted
                ? "Picks appear once a game kicks off."
                : "No games have kicked off yet. Picks appear once each game starts."}
            </p>
            <div className="mb-3 sm:mb-4">
              <SortLinks
                sort={sort}
                seasonId={season.seasonId}
                weekId={week.weekId}
              />
            </div>
            <PicksGrid games={data.games} players={players} sort={sort} />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li>
                <span className="font-bold">★</span> Lock of the week
              </li>
              <li>
                <span className="inline-block w-3 h-3 align-middle rounded-sm bg-green-100 dark:bg-green-900/40" />{" "}
                Covered
              </li>
              <li>
                <span className="inline-block w-3 h-3 align-middle rounded-sm bg-red-100 dark:bg-red-900/40" />{" "}
                Didn&apos;t cover
              </li>
              <li>
                <span className="inline-block w-3 h-3 align-middle rounded-sm bg-zinc-100 dark:bg-zinc-800" />{" "}
                Push
              </li>
              <li>
                <span className="text-green-700 dark:text-green-400">✓</span>{" "}
                Picked, shown at kickoff
              </li>
              <li>— No pick</li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
