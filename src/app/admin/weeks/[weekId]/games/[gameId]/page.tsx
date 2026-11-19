import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editGame, removeGame, removeGamePicks } from "@/app/actions/admin-games";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { toGametimeInput } from "@/lib/game-form";
import { getSession } from "@/lib/session";
import { getGame, getTeams } from "@/models/admin-games";
import AdminOnly from "../../../../admin-message";
import ConfirmDelete from "../../../../confirm-delete";
import GameForm from "../game-form";

export const metadata: Metadata = {
  title: "Edit Game | Sports Fans League",
};

const sectionClass =
  "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6";

export default async function EditGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ weekId: string; gameId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { picksDeleted } = await searchParams;
  const { weekId: weekIdParam, gameId: gameIdParam } = await params;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Edit Game</h1>
        <AdminOnly
          session={await getSession()}
          next={`/admin/weeks/${weekIdParam}/games/${gameIdParam}`}
        />
      </main>
    );
  }

  const gameId = toInt(gameIdParam);
  const game = gameId ? await getGame(gameId) : null;
  if (!game || game.weekId !== toInt(weekIdParam)) notFound();
  const teams = await getTeams([game.favoriteId, game.underdogId]);
  const league = teams.find((t) => t.teamId === game.favoriteId)?.league ?? "";
  const matchup = `${game.favoriteName} vs ${game.underdogName}`;

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href={`/admin/weeks/${game.weekId}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← {game.weekName}
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">
          {matchup}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {game.picks} {game.picks === 1 ? "pick" : "picks"}
          {game.official && " · Final"}
        </p>
      </div>

      {typeof picksDeleted === "string" && /^\d+$/.test(picksDeleted) && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Deleted {picksDeleted} {picksDeleted === "1" ? "pick" : "picks"}.
        </p>
      )}

      {game.official ? (
        <section className={`${sectionClass} text-sm text-zinc-600 dark:text-zinc-400`}>
          This game is final, so it can&apos;t be edited or deleted. Its
          results depend on the spread and score. To change the score or
          un-finalize it,{" "}
          <Link
            href={`/admin/weeks/${game.weekId}/games/${game.gameId}/score`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            set the score
          </Link>
          .
        </section>
      ) : (
        <>
          <section className={sectionClass}>
            {game.picks > 0 && (
              <p className="mb-4 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                Players have picked this game, so its teams can&apos;t be replaced.
                You can still swap the favorite and underdog, or change the
                spread, kickoff, site and storyline.
              </p>
            )}
            <GameForm
              action={editGame.bind(null, game.gameId)}
              teams={teams}
              submitLabel="Save"
              initial={{
                league,
                favoriteId: String(game.favoriteId),
                underdogId: String(game.underdogId),
                favoriteSite: String(game.favoriteSite),
                spread: String(game.spread),
                gametime: toGametimeInput(game.gametime),
                storyline: game.storyline ?? "",
              }}
            >
              <Link
                href={`/admin/weeks/${game.weekId}`}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
            </GameForm>
          </section>

          {game.picks > 0 && (
            <ConfirmDelete
              action={removeGamePicks.bind(null, game.gameId)}
              title="Delete picks"
              itemName={`${game.picks} ${game.picks === 1 ? "pick" : "picks"}`}
              details={[
                game.locks > 0 &&
                  `${game.locks} ${game.locks === 1 ? "is a player's lock" : "are players' locks"}, which ${game.locks === 1 ? "is" : "are"} lost too.`,
                "Afterwards the teams can be replaced, or the game deleted.",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}

          <ConfirmDelete
            action={removeGame.bind(null, game.gameId)}
            title="Delete game"
            itemName={matchup}
            blocked={
              game.picks > 0
                ? `${game.picks} ${game.picks === 1 ? "player has" : "players have"} picked this game, so it can't be deleted.`
                : null
            }
          />
        </>
      )}
    </main>
  );
}
