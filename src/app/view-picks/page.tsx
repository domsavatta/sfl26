import type { Metadata } from "next";
import SeasonWeekPicker from "@/components/season-week-picker";
import {
  getPicksSeasons,
  getWeekPicks,
  type PicksGame,
} from "@/models/picks";
import PicksGrid, { line } from "./picks-grid";

export const metadata: Metadata = {
  title: "View Picks | Sports Fans League",
};

/** Gametime holds Eastern wall-clock time in its UTC fields (see models/picks). */
const formatGametime = (gametime: Date) =>
  `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(gametime)} ET`;

const toInt = (value: string | string[] | undefined) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

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
                ? "Picks appear once a game kicks off. Players are sorted by overall season rank."
                : "No games have kicked off yet. Picks appear once each game starts."}
            </p>
            <PicksGrid games={data.games} players={data.players} />
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
