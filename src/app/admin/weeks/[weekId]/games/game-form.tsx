"use client";

import { startTransition, useActionState, useState } from "react";
import type { GameFormState } from "@/app/actions/admin-games";
import type { AdminTeam } from "@/models/admin-games";

export type GameFormValues = {
  league: string;
  favoriteId: string;
  underdogId: string;
  favoriteSite: string; // "1" favorite at home, "2" underdog at home, "3" neutral
  spread: string;
  gametime: string; // "YYYY-MM-DDTHH:mm", Eastern
  storyline: string;
};

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";
const hintClass = "mt-1 text-xs text-zinc-500 dark:text-zinc-400";

const SITES = [
  ["1", "Favorite at home"],
  ["2", "Underdog at home"],
  ["3", "Neutral site"],
] as const;

/**
 * Add or edit a game. Fields are controlled so a rejected save keeps what
 * was typed. The league choice only filters the team lists.
 */
export default function GameForm({
  action,
  teams,
  initial,
  submitLabel,
  children,
}: {
  action: (state: GameFormState, formData: FormData) => Promise<GameFormState>;
  teams: AdminTeam[];
  initial: GameFormValues;
  submitLabel: string;
  children?: React.ReactNode; // e.g. a Cancel link
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [values, setValues] = useState(initial);
  const set = (key: keyof GameFormValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const leagues = [...new Set(teams.map((t) => t.league))];
  const leagueTeams = teams.filter((t) => t.league === values.league);

  const teamSelect = (key: "favoriteId" | "underdogId", label: string) => (
    <div>
      <label htmlFor={key} className={labelClass}>
        {label}
      </label>
      <select
        id={key}
        name={key}
        required
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
      >
        <option value="">Choose a team…</option>
        {leagueTeams.map((t) => (
          <option key={t.teamId} value={t.teamId}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Submit without React's automatic form reset: it restores text
        // inputs from state but leaves the team <select>s cleared.
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      <fieldset>
        <legend className={labelClass}>League</legend>
        <div className="flex flex-wrap gap-2">
          {leagues.map((league) => (
            <label
              key={league}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${
                values.league === league
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 dark:border-zinc-700 text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="radio"
                value={league}
                checked={values.league === league}
                onChange={() =>
                  // Teams from the other league no longer apply.
                  setValues((v) => ({ ...v, league, favoriteId: "", underdogId: "" }))
                }
                className="sr-only"
              />
              {league}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {teamSelect("favoriteId", "Favorite")}
        {teamSelect("underdogId", "Underdog")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="spread" className={labelClass}>
            Spread
          </label>
          <input
            id="spread"
            name="spread"
            type="number"
            inputMode="decimal"
            required
            min={0}
            max={99.5}
            step={0.5}
            value={values.spread}
            onChange={(e) => set("spread", e.target.value)}
            className={inputClass}
          />
          <p className={hintClass}>Points the favorite gives. 0 is a pick&apos;em.</p>
        </div>
        <div>
          <label htmlFor="gametime" className={labelClass}>
            Kickoff (Eastern time)
          </label>
          <input
            id="gametime"
            name="gametime"
            type="datetime-local"
            required
            value={values.gametime}
            onChange={(e) => set("gametime", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Where</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SITES.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
              <input
                type="radio"
                name="favoriteSite"
                value={value}
                required
                checked={values.favoriteSite === value}
                onChange={() => set("favoriteSite", value)}
                className="size-4 accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="storyline" className={labelClass}>
          Storyline <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="storyline"
          name="storyline"
          rows={3}
          maxLength={2000}
          value={values.storyline}
          onChange={(e) => set("storyline", e.target.value)}
          className={inputClass}
        />
      </div>

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
