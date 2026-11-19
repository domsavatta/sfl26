import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addGame } from "@/app/actions/admin-games";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { toGametimeInput } from "@/lib/game-form";
import { getSession } from "@/lib/session";
import { getTeams } from "@/models/admin-games";
import { getWeek, getWeekGames } from "@/models/admin-weeks";
import AdminOnly from "../../../../admin-message";
import GameForm from "../game-form";

export const metadata: Metadata = {
  title: "Add Game | Sports Fans League",
};

export default async function AddGamePage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId: weekIdParam } = await params;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Add Game</h1>
        <AdminOnly session={await getSession()} next={`/admin/weeks/${weekIdParam}/games/new`} />
      </main>
    );
  }

  const weekId = toInt(weekIdParam);
  const week = weekId ? await getWeek(weekId) : null;
  if (!week) notFound();
  const [teams, games] = await Promise.all([getTeams(), getWeekGames(week.weekId)]);

  // Start from the week's last game: same league and kickoff, the usual case
  // when adding several games to a week.
  const last = games.at(-1);
  const leagues = [...new Set(teams.map((t) => t.league))];

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href={`/admin/weeks/${week.weekId}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← {week.weekName}
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Add a game to {week.weekName}
        </h1>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <GameForm
          action={addGame.bind(null, week.weekId)}
          teams={teams}
          submitLabel="Add game"
          initial={{
            league: last?.league ?? leagues[0] ?? "",
            favoriteId: "",
            underdogId: "",
            favoriteSite: "1",
            spread: "",
            gametime: last ? toGametimeInput(last.gametime) : "",
            storyline: "",
          }}
        >
          <Link
            href={`/admin/weeks/${week.weekId}`}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </GameForm>
      </section>
    </main>
  );
}
