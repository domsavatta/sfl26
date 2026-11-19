import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { scoreGame } from "@/app/actions/admin-games";
import { getAdmin } from "@/lib/admin";
import { formatGametime, toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getGame } from "@/models/admin-games";
import AdminOnly from "../../../../../admin-message";
import ScoreForm from "./score-form";

export const metadata: Metadata = {
  title: "Set Score | Sports Fans League",
};

export default async function ScorePage({
  params,
}: {
  params: Promise<{ weekId: string; gameId: string }>;
}) {
  const { weekId: weekIdParam, gameId: gameIdParam } = await params;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Set Score</h1>
        <AdminOnly
          session={await getSession()}
          next={`/admin/weeks/${weekIdParam}/games/${gameIdParam}/score`}
        />
      </main>
    );
  }

  const gameId = toInt(gameIdParam);
  const game = gameId ? await getGame(gameId) : null;
  if (!game || game.weekId !== toInt(weekIdParam)) notFound();

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
          {game.favoriteName} vs {game.underdogName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {formatGametime(game.gametime)} · {game.picks} {game.picks === 1 ? "pick" : "picks"}
          {game.official && " · Final"}
        </p>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        {game.started ? (
          <ScoreForm
            action={scoreGame.bind(null, game.gameId)}
            game={{
              favoriteName: game.favoriteName,
              underdogName: game.underdogName,
              spread: game.spread,
              favoriteScore: game.favoriteScore,
              underdogScore: game.underdogScore,
              status: game.status,
              result: game.tie
                ? "push"
                : game.winnerId === game.favoriteId
                  ? "favorite"
                  : game.winnerId === game.underdogId
                    ? "underdog"
                    : null,
              official: game.official,
            }}
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This game hasn&apos;t kicked off yet, so it can&apos;t have a score.
          </p>
        )}
      </section>
    </main>
  );
}
