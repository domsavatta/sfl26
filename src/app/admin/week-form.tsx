"use client";

import { useActionState, useState } from "react";
import type { WeekFormState } from "@/app/actions/admin-weeks";
import type { WeekInput } from "@/models/admin-weeks";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/**
 * Add or edit a week. Fields are controlled so a rejected save (e.g. a
 * duplicate name) keeps what was typed.
 */
export default function WeekForm({
  action,
  initial,
  submitLabel,
  idPrefix,
  children,
}: {
  action: (state: WeekFormState, formData: FormData) => Promise<WeekFormState>;
  initial: WeekInput;
  submitLabel: string;
  idPrefix: string;
  children?: React.ReactNode; // e.g. a Cancel link next to the button
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [week, setWeek] = useState(initial);
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor={id("weekName")} className={labelClass}>
            Name
          </label>
          <input
            id={id("weekName")}
            name="weekName"
            required
            maxLength={50}
            value={week.weekName}
            onChange={(e) => setWeek({ ...week, weekName: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={id("sort")} className={labelClass}>
            Order
          </label>
          <input
            id={id("sort")}
            name="sort"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={999}
            step={1}
            value={week.sort || ""}
            onChange={(e) => setWeek({ ...week, sort: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Status</legend>
        {(
          [
            ["live", "Live", "Shows on the site: Make Picks, View Picks, Standings and the home page."],
            ["official", "Official", "Results are final. The week is closed for picks."],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name={key}
              checked={week[key]}
              onChange={(e) => setWeek({ ...week, [key]: e.target.checked })}
              className="mt-1 size-4 accent-blue-600"
            />
            <span>
              <span className="block text-sm font-medium text-black dark:text-white">
                {label}
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {children}
        {state && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm ${
              state.ok
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
