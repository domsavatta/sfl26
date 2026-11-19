import type { NewPick } from "@/models/make-picks";

/**
 * Reads the Make Picks form:
 *   pick-{gameId} = teamId   (one per picked game)
 *   lock-{weekId} = gameId   (at most one per week)
 * Returns the picks to save, or a message for the player. The server still
 * validates every pick against the database (see savePicks).
 */
export function parsePicksForm(
  formData: FormData,
): { picks: NewPick[] } | { error: string } {
  const toId = (value: FormDataEntryValue) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const picks = new Map<number, number>(); // gameId -> teamId
  const locks = new Set<number>(); // gameIds
  for (const [key, value] of formData) {
    const pick = /^pick-(\d+)$/.exec(key);
    const lock = /^lock-(\d+)$/.exec(key);
    const id = toId(value);
    if (pick && id) picks.set(Number(pick[1]), id);
    if (lock && id) locks.add(id);
  }

  for (const gameId of locks) {
    if (!picks.has(gameId)) return { error: "Pick a team in your lock game." };
  }
  if (!picks.size) return { error: "Make at least one pick." };

  return {
    picks: [...picks].map(([gameId, teamId]) => ({
      gameId,
      teamId,
      isLock: locks.has(gameId),
    })),
  };
}
