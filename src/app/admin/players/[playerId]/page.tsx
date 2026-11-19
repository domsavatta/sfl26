import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editPlayer, removePlayer, resetPlayerPassword } from "@/app/actions/admin-players";
import { getAdmin } from "@/lib/admin";
import { getDefaultPassword } from "@/lib/default-password";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getCurrentSeasonName, getPlayer } from "@/models/admin-players";
import AdminOnly from "../../admin-message";
import ConfirmDelete from "../../confirm-delete";
import PlayerForm from "../player-form";
import ResetPassword from "./reset-password";

export const metadata: Metadata = {
  title: "Edit Player | Sports Fans League",
};

export default async function EditPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { playerId: playerIdParam } = await params;
  const query = await searchParams;
  const admin = await getAdmin();
  if (!admin) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Edit Player</h1>
        <AdminOnly session={await getSession()} next={`/admin/players/${playerIdParam}`} />
      </main>
    );
  }

  const playerId = toInt(playerIdParam);
  const [player, seasonName, defaultPassword] = await Promise.all([
    playerId ? getPlayer(playerId) : null,
    getCurrentSeasonName(),
    getDefaultPassword(),
  ]);
  if (!player) notFound();
  const message =
    query.added === "1"
      ? `Added ${player.name}. They can sign in with the default password.`
      : query.reset === "1"
        ? `Reset ${player.name}'s password to the default password.`
        : null;

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href={player.inSeason ? "/admin/players" : "/admin/players?view=all"}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Players
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-black dark:text-white">{player.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {[
            player.inSeason && seasonName ? `Playing in the ${seasonName}` : "Not playing this season",
            player.seasonPicks > 0 && `${player.seasonPicks} picks this season`,
            player.admin && "Admin",
            player.hidden && "Hidden",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {message && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {message}
        </p>
      )}

      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <PlayerForm
          action={editPlayer.bind(null, player.playerId)}
          seasonName={seasonName}
          isSelf={player.playerId === admin.playerId}
          submitLabel="Save"
          initial={{
            name: player.name,
            firstName: player.firstName,
            lastName: player.lastName,
            email: player.email,
            profile: player.profile,
            hidden: player.hidden,
            inSeason: player.inSeason,
            admin: player.admin,
          }}
        >
          <Link
            href="/admin/players"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </PlayerForm>
      </section>

      <ResetPassword
        action={resetPlayerPassword.bind(null, player.playerId)}
        playerName={player.name}
        available={!!defaultPassword}
      />

      <ConfirmDelete
        action={removePlayer.bind(null, player.playerId)}
        title="Delete player"
        itemName={player.name}
        details="Their login, roles and season sign-ups are removed too."
        blocked={
          player.playerId === admin.playerId
            ? "You can't delete yourself."
            : player.totalPicks > 0
              ? `${player.name} has ${player.totalPicks} ${player.totalPicks === 1 ? "pick" : "picks"}, so they can't be deleted. Hide them instead.`
              : player.inStandings
                ? `${player.name} is in the standings, so they can't be deleted. Hide them instead.`
                : null
        }
      />
    </main>
  );
}
