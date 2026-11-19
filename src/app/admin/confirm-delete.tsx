"use client";

import { useActionState, useId } from "react";

type State = { ok: boolean; message: string } | null;

/**
 * A "Delete …" section: asks for confirmation, then runs `action` (which
 * redirects on success). When `blocked` is set, explains why instead of
 * offering the button; the server checks again either way.
 */
export default function ConfirmDelete({
  action,
  title,
  itemName,
  blocked,
  details,
}: {
  action: (state: State) => Promise<State>;
  title: string; // e.g. "Delete week"
  itemName: string; // e.g. "Week 17"
  blocked?: string | null;
  details?: string; // extra explanation under the description
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-lg font-semibold text-black dark:text-white">
        {title}
      </h2>
      {blocked ? (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{blocked}</p>
      ) : (
        <form
          action={formAction}
          onSubmit={(e) => {
            if (!window.confirm(`Delete ${itemName}? This can't be undone.`)) {
              e.preventDefault();
            }
          }}
          className="mt-1 space-y-3"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Permanently removes {itemName}. This can&apos;t be undone.
            {details && <> {details}</>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-500 disabled:opacity-60"
            >
              {isPending ? "Deleting…" : `Delete ${itemName}`}
            </button>
            {state && !state.ok && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {state.message}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
