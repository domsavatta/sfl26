import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editTeam, removeTeam } from "@/app/actions/admin-teams";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getTeam, LEAGUES, type League } from "@/models/admin-teams";
import AdminOnly from "../../admin-message";
import ConfirmDelete from "../../confirm-delete";
import TeamForm from "../team-form";

export const metadata: Metadata = {
  title: "Edit Team | Sports Fans League",
};

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdParam } = await params;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Edit Team</h1>
        <AdminOnly session={await getSession()} next={`/admin/teams/${teamIdParam}`} />
      </main>
    );
  }

  const teamId = toInt(teamIdParam);
  const team = teamId ? await getTeam(teamId) : null;
  if (!team) notFound();

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href={`/admin/teams?league=${team.league}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Teams
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">{team.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {team.league} · {team.games} {team.games === 1 ? "game" : "games"}
          {!team.active && " · Inactive"}
        </p>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <TeamForm
          action={editTeam.bind(null, team.teamId)}
          leagues={LEAGUES}
          leagueLocked={team.games > 0 ? "This team has games, so its league can't change." : null}
          submitLabel="Save"
          initial={{
            name: team.name,
            league: team.league as League,
            abbreviation: team.abbreviation,
            active: team.active,
          }}
        >
          <Link
            href={`/admin/teams?league=${team.league}`}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </TeamForm>
      </section>

      <ConfirmDelete
        action={removeTeam.bind(null, team.teamId)}
        title="Delete team"
        itemName={team.name}
        blocked={
          team.games > 0
            ? `${team.name} has ${team.games} ${team.games === 1 ? "game" : "games"}, so it can't be deleted. Make it inactive instead: it keeps its games but isn't offered for new ones.`
            : null
        }
      />
    </main>
  );
}
