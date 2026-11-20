import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editSeason } from "@/app/actions/admin-seasons";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getSeason } from "@/models/admin-seasons";
import AdminOnly from "../../admin-message";
import EditSeasonForm from "../edit-season-form";

export const metadata: Metadata = {
  title: "Edit Season | Admin | Sports Fans League",
};

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId: seasonIdParam } = await params;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Edit Season</h1>
        <AdminOnly session={await getSession()} next={`/admin/seasons/${seasonIdParam}`} />
      </main>
    );
  }

  const seasonId = toInt(seasonIdParam);
  const season = seasonId ? await getSeason(seasonId) : null;
  if (!season) notFound();

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link href="/admin/seasons" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Seasons
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">{season.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {season.weeks} {season.weeks === 1 ? "week" : "weeks"} · {season.players}{" "}
          {season.players === 1 ? "player" : "players"}
          {season.current && " · Current"}
          {!season.active && " · Hidden"}
        </p>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <EditSeasonForm
          action={editSeason.bind(null, season.seasonId)}
          initialName={season.name}
          initialSort={season.sort}
          hasDefaultPassword={season.hasDefaultPassword}
        />
      </section>
    </main>
  );
}
