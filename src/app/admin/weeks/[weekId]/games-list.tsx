import Link from "next/link";
import { formatGametime, line } from "@/lib/format";
import type { AdminGame } from "@/models/admin-weeks";

function gameStatus(game: AdminGame) {
  if (game.official) return "Final";
  if (game.status) return game.status;
  return game.started ? "Started" : "Not started";
}

function GameItem({
  game,
  weekId,
  highlight,
}: {
  game: AdminGame;
  weekId: number;
  highlight: boolean;
}) {
  const sides = [
    { side: "favorite", picks: game.favoritePicks },
    { side: "underdog", picks: game.underdogPicks },
  ] as const;

  return (
    <li
      className={`py-3 first:pt-0 last:pb-0 ${
        highlight ? "-mx-2 px-2 rounded-md bg-green-50 dark:bg-green-950/40" : ""
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {game.league} · {formatGametime(game.gametime)}
        </span>
        <span className="flex items-baseline gap-3">
          <span
            className={`font-semibold ${
              game.official ? "text-black dark:text-white" : ""
            }`}
          >
            {gameStatus(game)}
          </span>
          {/* Final games can't be edited; started games can be scored. */}
          {!game.official && (
            <Link
              href={`/admin/weeks/${weekId}/games/${game.gameId}`}
              aria-label={`Edit ${game.favorite.name} vs ${game.underdog.name}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </Link>
          )}
          {game.started && (
            <Link
              href={`/admin/weeks/${weekId}/games/${game.gameId}/score`}
              aria-label={`Score ${game.favorite.name} vs ${game.underdog.name}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Score
            </Link>
          )}
        </span>
      </div>
      {sides.map(({ side, picks }) => {
        const team = game[side];
        const covered = game.official && !game.tie && game.winnerId === team.teamId;
        return (
          <div key={side} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 text-sm">
              <span
                className={`font-semibold ${
                  covered
                    ? "text-green-700 dark:text-green-400"
                    : "text-black dark:text-white"
                }`}
              >
                {team.name}
              </span>
              <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">
                {line(game, side)}
              </span>
              <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {team.location} · {picks} {picks === 1 ? "pick" : "picks"}
                {covered && " · Covered"}
              </span>
            </div>
            {team.score !== null && (
              <span className="text-base font-bold tabular-nums text-black dark:text-white">
                {team.score}
              </span>
            )}
          </div>
        );
      })}
      {game.official && game.tie && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Push against the spread
        </p>
      )}
      {game.storyline && (
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {game.storyline}
        </p>
      )}
    </li>
  );
}

/** The week's games, with links to add, edit and delete them. */
export default function GamesList({
  games,
  weekId,
  savedGameId = null,
  scoredGameId = null,
  deleted = false,
}: {
  games: AdminGame[];
  weekId: number;
  savedGameId?: number | null;
  scoredGameId?: number | null;
  deleted?: boolean;
}) {
  const saved = games.find((g) => g.gameId === savedGameId);
  const scored = games.find((g) => g.gameId === scoredGameId);
  return (
    <section
      aria-labelledby="games-heading"
      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="games-heading" className="text-lg font-semibold text-black dark:text-white">
          Games{" "}
          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({games.length})
          </span>
        </h2>
        <Link
          href={`/admin/weeks/${weekId}/games/new`}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add game
        </Link>
      </div>
      {(saved || scored || deleted) && (
        <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">
          {scored
            ? `Saved the score for ${scored.favorite.name} vs ${scored.underdog.name} and updated the standings.`
            : saved
              ? `Saved ${saved.favorite.name} vs ${saved.underdog.name}.`
              : "Game deleted."}
        </p>
      )}
      {games.length ? (
        <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {games.map((game) => (
            <GameItem
              key={game.gameId}
              game={game}
              weekId={weekId}
              highlight={game.gameId === savedGameId || game.gameId === scoredGameId}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No games this week yet.
        </p>
      )}
    </section>
  );
}
