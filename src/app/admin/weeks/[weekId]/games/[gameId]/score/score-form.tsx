"use client";

import { startTransition, useActionState, useState } from "react";
import type { GameFormState } from "@/app/actions/admin-games";
import { coverResult, type GameResult } from "@/lib/score-form";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

export type ScoreFormGame = {
  favoriteName: string;
  underdogName: string;
  spread: number;
  favoriteScore: number | null;
  underdogScore: number | null;
  status: string | null;
  result: GameResult | null; // as stored
  official: boolean;
};

const toScore = (value: string) =>
  value.trim() !== "" && Number.isInteger(Number(value)) ? Number(value) : null;

/**
 * Scores, status, who covered and Official. "Who covered" follows the
 * scores until the admin picks it, so it can still be overridden.
 */
export default function ScoreForm({
  action,
  game,
}: {
  action: (state: GameFormState, formData: FormData) => Promise<GameFormState>;
  game: ScoreFormGame;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [favoriteScore, setFavoriteScore] = useState(game.favoriteScore?.toString() ?? "");
  const [underdogScore, setUnderdogScore] = useState(game.underdogScore?.toString() ?? "");
  const [status, setStatus] = useState(game.status ?? "");
  const [official, setOfficial] = useState(game.official);
  const [chosen, setChosen] = useState<GameResult | null>(game.result);
  // A stored result that differs from the score was set by hand: keep it.
  const [overridden, setOverridden] = useState(() => {
    if (game.favoriteScore === null || game.underdogScore === null) return false;
    return game.result !== coverResult(game.favoriteScore, game.underdogScore, game.spread);
  });

  const fav = toScore(favoriteScore);
  const dog = toScore(underdogScore);
  const byScore = fav !== null && dog !== null ? coverResult(fav, dog, game.spread) : null;
  const result = overridden ? chosen : byScore;

  const resultLabel = (r: GameResult) =>
    r === "push"
      ? "Push"
      : `${r === "favorite" ? game.favoriteName : game.underdogName} covered`;
  const spreadText = game.spread ? `${game.favoriteName} -${game.spread}` : "Pick'em";

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
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ["favoriteScore", `${game.favoriteName}`, "Favorite", favoriteScore, setFavoriteScore],
            ["underdogScore", `${game.underdogName}`, "Underdog", underdogScore, setUnderdogScore],
          ] as const
        ).map(([name, team, role, value, setValue]) => (
          <div key={name}>
            <label htmlFor={name} className={labelClass}>
              {team}{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">({role})</span>
            </label>
            <input
              id={name}
              name={name}
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${inputClass} text-lg font-semibold tabular-nums`}
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="status" className={labelClass}>
          Status <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="status"
          name="status"
          maxLength={200}
          placeholder="e.g. 3rd Qtr 5:12"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Shown on the home page while the game is in progress.
        </p>
      </div>

      <fieldset disabled={byScore === null}>
        <legend className={labelClass}>Against the spread ({spreadText})</legend>
        {byScore === null ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter both scores.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(["favorite", "underdog", "push"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
                  <input
                    type="radio"
                    name="result"
                    value={r}
                    checked={result === r}
                    onChange={() => {
                      setChosen(r);
                      setOverridden(r !== byScore);
                    }}
                    className="size-4 accent-blue-600"
                  />
                  {resultLabel(r)}
                </label>
              ))}
            </div>
            <p
              className={`mt-2 text-xs ${
                overridden && result !== byScore
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {overridden && result !== byScore
                ? `This doesn't match the score. By the score, ${
                    byScore === "push" ? "it's a push" : resultLabel(byScore)
                  }.`
                : "Set from the score. Choose another only to override it."}
            </p>
          </>
        )}
      </fieldset>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="official"
          checked={official}
          onChange={(e) => setOfficial(e.target.checked)}
          className="mt-1 size-4 accent-blue-600"
        />
        <span>
          <span className="block text-sm font-medium text-black dark:text-white">Final</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            The game is over: it counts in the standings and its picks are scored.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving and updating standings…" : "Save score"}
        </button>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Saving updates the standings for this week and any later weeks, which
        takes a few seconds.
      </p>
    </form>
  );
}
