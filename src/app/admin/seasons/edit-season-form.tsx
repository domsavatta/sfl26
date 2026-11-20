"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import type { SeasonFormState } from "@/app/actions/admin-seasons";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/**
 * Edit a season's name, sort order and default password. The current
 * password is never shown (it stays on the server); leaving the field blank
 * keeps it. Fields keep what was typed if a save is rejected.
 */
export default function EditSeasonForm({
  action,
  initialName,
  initialSort,
  hasDefaultPassword,
}: {
  action: (state: SeasonFormState, formData: FormData) => Promise<SeasonFormState>;
  initialName: string;
  initialSort: number;
  hasDefaultPassword: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [name, setName] = useState(initialName);
  const [sort, setSort] = useState(String(initialSort));
  const [password, setPassword] = useState("");

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
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="season-name" className={labelClass}>
            Name
          </label>
          <input
            id="season-name"
            name="name"
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="season-sort" className={labelClass}>
            Sort order
          </label>
          <input
            id="season-sort"
            name="sort"
            required
            inputMode="numeric"
            pattern="-?[0-9]+"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Seasons are listed highest sort order first.
      </p>

      <div>
        <label htmlFor="defaultPassword" className={labelClass}>
          New default password
        </label>
        <input
          id="defaultPassword"
          name="defaultPassword"
          maxLength={10}
          autoComplete="off"
          spellCheck={false}
          placeholder={hasDefaultPassword ? "Leave blank to keep the current one" : "Not set"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        />
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {hasDefaultPassword ? "This season has a default password. " : "This season has no default password. "}
          New players and password resets use the current season&apos;s; players
          who already have a password keep it. Up to 10 characters.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/admin/seasons"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
