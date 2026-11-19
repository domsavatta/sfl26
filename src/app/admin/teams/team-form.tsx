"use client";

import { startTransition, useActionState, useState } from "react";
import type { TeamFormState } from "@/app/actions/admin-teams";
import type { TeamInput } from "@/models/admin-teams";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/** Add or edit a team; fields keep what was typed if a save is rejected. */
export default function TeamForm({
  action,
  initial,
  leagues,
  leagueLocked,
  submitLabel,
  children,
}: {
  action: (state: TeamFormState, formData: FormData) => Promise<TeamFormState>;
  initial: TeamInput;
  leagues: readonly string[];
  leagueLocked?: string | null; // why the league can't change, if it can't
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [team, setTeam] = useState(initial);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            value={team.name}
            onChange={(e) => setTeam({ ...team, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="abbreviation" className={labelClass}>
            Abbreviation <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="abbreviation"
            name="abbreviation"
            maxLength={20}
            value={team.abbreviation ?? ""}
            onChange={(e) => setTeam({ ...team, abbreviation: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset disabled={!!leagueLocked}>
        <legend className={labelClass}>League</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {leagues.map((league) => (
            <label key={league} className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
              <input
                type="radio"
                name="league"
                value={league}
                required
                checked={team.league === league}
                onChange={() => setTeam({ ...team, league: league as TeamInput["league"] })}
                className="size-4 accent-blue-600"
              />
              {league}
            </label>
          ))}
        </div>
        {leagueLocked && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{leagueLocked}</p>
        )}
      </fieldset>
      {/* Nothing in a disabled fieldset is submitted, so send the league here. */}
      {leagueLocked && <input type="hidden" name="league" value={team.league} />}

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="active"
          checked={team.active}
          onChange={(e) => setTeam({ ...team, active: e.target.checked })}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          <span className="block text-sm font-medium text-black dark:text-white">Active</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Offered when adding games. Inactive teams keep their existing games.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {children}
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
