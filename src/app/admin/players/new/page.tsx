import type { Metadata } from "next";
import Link from "next/link";
import { addPlayer } from "@/app/actions/admin-players";
import { getAdmin } from "@/lib/admin";
import { getDefaultPassword } from "@/lib/default-password";
import { getSession } from "@/lib/session";
import { getCurrentSeasonName } from "@/models/admin-players";
import AdminOnly from "../../admin-message";
import PlayerForm from "../player-form";

export const metadata: Metadata = {
  title: "Add Player | Sports Fans League",
};

export default async function AddPlayerPage() {
  if (!(await getAdmin())) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Add Player</h1>
        <AdminOnly session={await getSession()} next="/admin/players/new" />
      </main>
    );
  }
  const [seasonName, defaultPassword] = await Promise.all([
    getCurrentSeasonName(),
    getDefaultPassword(),
  ]);
  const hasDefault = !!defaultPassword;

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link href="/admin/players" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Players
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">Add a player</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          New players sign in with the league&apos;s default password, then change it on their Account page.
        </p>
      </div>
      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        {hasDefault ? (
          <PlayerForm
            action={addPlayer}
            seasonName={seasonName}
            submitLabel="Add player"
            initial={{
              name: "",
              firstName: null,
              lastName: null,
              email: null,
              profile: null,
              hidden: false,
              inSeason: !!seasonName,
              admin: false,
            }}
          >
            <Link
              href="/admin/players"
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Link>
          </PlayerForm>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Adding players needs a default password for them to sign in with. Set
            the current season&apos;s default password (the{" "}
            <code className="text-xs">defaultPassword</code> column on the Season
            table).
          </p>
        )}
      </section>
    </main>
  );
}
