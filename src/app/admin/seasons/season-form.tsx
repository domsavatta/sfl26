"use client";

import { startTransition, useActionState, useState } from "react";
import type { SeasonFormState } from "@/app/actions/admin-seasons";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/** Add a season; fields keep what was typed if a save is rejected. */
export default function SeasonForm({
  action,
  initialName,
}: {
  action: (state: SeasonFormState, formData: FormData) => Promise<SeasonFormState>;
  initialName: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [makeCurrent, setMakeCurrent] = useState(false);

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
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
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
          <label htmlFor="defaultPassword" className={labelClass}>
            Default password
          </label>
          <input
            id="defaultPassword"
            name="defaultPassword"
            required
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        New players and password resets use the current season&apos;s default
        password. Up to 10 characters. The season starts with no players; add
        them on the Players page.
      </p>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="makeCurrent"
          checked={makeCurrent}
          onChange={(e) => setMakeCurrent(e.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          <span className="block text-sm font-medium text-black dark:text-white">
            Make it the current season
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Make Picks, the home page and the admin weeks list switch to it now.
            You can also do this later.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add season"}
        </button>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
