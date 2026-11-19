import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentPlayer } from "@/lib/session";
import { getMakePicks } from "@/models/make-picks";
import PicksForm from "./picks-form";

export const metadata: Metadata = {
  title: "Make Picks | Sports Fans League",
};

function Message({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 text-zinc-600 dark:text-zinc-400">
      {children}
    </section>
  );
}

export default async function MakePicks() {
  const player = await getCurrentPlayer();
  const data = player ? await getMakePicks(player.playerId) : null;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Make Picks
        </h1>
        {data?.season && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {data.season.seasonName} · Picks lock when each game kicks off.
          </p>
        )}
      </div>

      {!player ? (
        <Message>
          <Link
            href="/sign-in"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>{" "}
          to make your picks.
        </Message>
      ) : !data?.season ? (
        <Message>There&apos;s no current season.</Message>
      ) : !data.inSeason ? (
        <Message>
          You&apos;re not signed up for the {data.season.seasonName}.
        </Message>
      ) : data.weeks.length === 0 ? (
        <Message>
          No games are open for picks right now. Check{" "}
          <Link
            href="/view-picks"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Picks
          </Link>{" "}
          for this week&apos;s results.
        </Message>
      ) : (
        <PicksForm weeks={data.weeks} />
      )}
    </main>
  );
}
