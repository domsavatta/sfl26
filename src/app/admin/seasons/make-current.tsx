"use client";

import { useActionState } from "react";
import type { SeasonFormState } from "@/app/actions/admin-seasons";

/** "Make current" for one season, after a confirmation. */
export default function MakeCurrent({
  action,
  seasonName,
  currentName,
}: {
  action: (state: SeasonFormState) => Promise<SeasonFormState>;
  seasonName: string;
  currentName: string | null;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const message =
          `Make the ${seasonName} the current season?\n\n` +
          "Make Picks, the home page and the admin weeks list will use it" +
          (currentName ? ` instead of the ${currentName}.` : ".");
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="inline"
    >
      <button
        type="submit"
        disabled={isPending}
        aria-label={`Make the ${seasonName} current`}
        className="whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Make current"}
      </button>
      {state && !state.ok && (
        <span role="alert" className="ml-2 text-xs text-red-700 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}
