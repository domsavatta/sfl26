import type { Metadata } from "next";
import Link from "next/link";
import { addTeam } from "@/app/actions/admin-teams";
import { getAdmin } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { LEAGUES } from "@/models/admin-teams";
import AdminOnly from "../../admin-message";
import TeamForm from "../team-form";

export const metadata: Metadata = {
  title: "Add Team | Sports Fans League",
};

export default async function AddTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { league } = await searchParams;
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Add Team</h1>
        <AdminOnly session={await getSession()} next="/admin/teams/new" />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link href="/admin/teams" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Teams
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">Add a team</h1>
      </div>
      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <TeamForm
          action={addTeam}
          leagues={LEAGUES}
          submitLabel="Add team"
          initial={{
            name: "",
            league: LEAGUES.find((l) => l === league) ?? LEAGUES[0],
            abbreviation: null,
            active: true,
          }}
        >
          <Link
            href="/admin/teams"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </TeamForm>
      </section>
    </main>
  );
}
