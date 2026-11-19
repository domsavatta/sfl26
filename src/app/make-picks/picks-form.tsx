"use client";

import { useActionState, useState } from "react";
import { submitPicks } from "@/app/actions/picks";
import { formatGametime, line } from "@/lib/format";
import type { MakePicksGame, MakePicksWeek } from "@/models/make-picks";

export default function PicksForm({ weeks }: { weeks: MakePicksWeek[] }) {
  const [state, formAction, isPending] = useActionState(submitPicks, null);

  // gameId -> picked teamId
  const [picks, setPicks] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      weeks.flatMap((w) =>
        w.games
          .filter((g) => g.pickTeamId !== null)
          .map((g) => [g.gameId, g.pickTeamId!]),
      ),
    ),
  );
  // weekId -> lock gameId (only weeks whose lock can still change)
  const [locks, setLocks] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(
      weeks.map((w) => [
        w.weekId,
        w.games.find((g) => g.isLock)?.gameId ?? null,
      ]),
    ),
  );

  return (
    <form action={formAction} className="space-y-6 sm:space-y-8">
      {weeks.map((week) => {
        const picked = week.games.filter((g) => picks[g.gameId]).length;
        return (
          <section
            key={week.weekId}
            className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
                {week.weekName}
              </h2>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {picked} of {week.games.length} picked
              </span>
            </div>

            {week.startedLock ? (
              <p className="mb-4 rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span aria-hidden>★ </span>
                Your lock this week is <strong>{week.startedLock.teamName}</strong>{" "}
                vs {week.startedLock.opponentName}. That game has started, so
                your lock can&apos;t be changed.
              </p>
            ) : (
              <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <span>
                  Pick a team in a game, then choose one game as your{" "}
                  <span className="font-semibold">★ lock</span>.
                </span>
                {locks[week.weekId] !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocks((l) => ({ ...l, [week.weekId]: null }))
                    }
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear lock
                  </button>
                )}
              </p>
            )}

            <ol className="grid gap-3 sm:grid-cols-2">
              {week.games.map((game) => (
                <GameCard
                  key={game.gameId}
                  game={game}
                  weekId={week.weekId}
                  pick={picks[game.gameId] ?? null}
                  onPick={(teamId) =>
                    setPicks((p) => ({ ...p, [game.gameId]: teamId }))
                  }
                  canLock={!week.startedLock}
                  isLock={locks[week.weekId] === game.gameId}
                  onLock={() =>
                    setLocks((l) => ({ ...l, [week.weekId]: game.gameId }))
                  }
                />
              ))}
            </ol>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-zinc-50/95 dark:bg-black/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save picks"}
        </button>
        {state && (
          <p
            role="status"
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

function GameCard({
  game,
  weekId,
  pick,
  onPick,
  canLock,
  isLock,
  onLock,
}: {
  game: MakePicksGame;
  weekId: number;
  pick: number | null;
  onPick: (teamId: number) => void;
  canLock: boolean;
  isLock: boolean;
  onLock: () => void;
}) {
  return (
    <li
      className={`rounded-lg border p-3 ${
        isLock
          ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-400 dark:ring-amber-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <fieldset>
        <legend className="mb-2 w-full text-xs text-zinc-500 dark:text-zinc-400">
          {game.league} · {formatGametime(game.gametime)}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["favorite", "underdog"] as const).map((side) => {
            const team = game[side];
            const checked = pick === team.teamId;
            return (
              <label
                key={side}
                className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${
                  checked
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-300 dark:border-zinc-700 text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="radio"
                  name={`pick-${game.gameId}`}
                  value={team.teamId}
                  checked={checked}
                  onChange={() => onPick(team.teamId)}
                  className="sr-only"
                />
                <span className="block font-semibold truncate">{team.name}</span>
                <span
                  className={`block text-xs ${checked ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}
                >
                  {line(game, side)} · {team.location}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {game.storyline && (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {game.storyline}
        </p>
      )}
      {canLock && (
        <label
          className={`mt-2 inline-flex items-center gap-1.5 text-sm ${
            pick
              ? "cursor-pointer text-zinc-700 dark:text-zinc-300"
              : "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
          }`}
          title={pick ? undefined : "Pick a team first"}
        >
          <input
            type="radio"
            name={`lock-${weekId}`}
            value={game.gameId}
            checked={isLock}
            disabled={!pick}
            onChange={onLock}
            className="accent-amber-500"
          />
          <span className={isLock ? "font-semibold text-amber-700 dark:text-amber-400" : ""}>
            ★ Lock
          </span>
        </label>
      )}
    </li>
  );
}
