"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { PlayerFormState } from "@/app/actions/admin-players";

/** Resets the player's password to the default, after a confirmation. */
export default function ResetPassword({
  action,
  playerName,
  available,
}: {
  action: (state: PlayerFormState) => Promise<PlayerFormState>;
  playerName: string;
  available: boolean; // the current season has a default password
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <section
      aria-labelledby="reset-heading"
      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6"
    >
      <h2 id="reset-heading" className="text-lg font-semibold text-black dark:text-white">
        Password
      </h2>
      {available ? (
        <form
          action={formAction}
          onSubmit={(e) => {
            if (!window.confirm(`Reset ${playerName}'s password to the default password?`)) {
              e.preventDefault();
            }
          }}
          className="mt-1 space-y-3"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sets {playerName}&apos;s password to the league&apos;s default password.
            Let them know, and ask them to change it on their Account page.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Resetting…" : "Reset password to default"}
            </button>
            {state && !state.ok && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {state.message}
              </p>
            )}
          </div>
        </form>
      ) : (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Resetting passwords needs a default password. Set the current
          season&apos;s default password on the{" "}
          <Link href="/admin/seasons" className="text-blue-600 dark:text-blue-400 hover:underline">
            Seasons page
          </Link>
          .
        </p>
      )}
    </section>
  );
}
