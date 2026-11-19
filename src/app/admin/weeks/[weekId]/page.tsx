import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editWeek, removeWeek } from "@/app/actions/admin-weeks";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getWeek, getWeekGames } from "@/models/admin-weeks";
import AdminOnly from "../../admin-message";
import WeekForm from "../../week-form";
import DeleteWeek from "./delete-week";
import GamesList from "./games-list";

export const metadata: Metadata = {
  title: "Edit Week | Sports Fans League",
};

export default async function EditWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ weekId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { weekId: weekIdParam } = await params;
  const admin = await getAdmin();

  if (!admin) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Edit Week
        </h1>
        <AdminOnly session={await getSession()} next={`/admin/weeks/${weekIdParam}`} />
      </main>
    );
  }

  const weekId = toInt(weekIdParam);
  const week = weekId ? await getWeek(weekId) : null;
  if (!week) notFound();
  const games = await getWeekGames(week.weekId);

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Edit {week.weekName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {week.games} {week.games === 1 ? "game" : "games"}
        </p>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <WeekForm
          action={editWeek.bind(null, week.weekId)}
          idPrefix="edit"
          submitLabel="Save"
          initial={{
            weekName: week.weekName,
            sort: week.sort,
            live: week.live,
            official: week.official,
          }}
        >
          <Link
            href="/admin"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </WeekForm>
      </section>

      <GamesList
        games={games}
        weekId={week.weekId}
        savedGameId={toInt(query.gameSaved)}
        scoredGameId={toInt(query.gameScored)}
        deleted={query.gameDeleted === "1"}
      />

      <DeleteWeek
        action={removeWeek.bind(null, week.weekId)}
        weekName={week.weekName}
        games={week.games}
      />
    </main>
  );
}
