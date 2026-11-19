"use server";

import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { parseGameForm } from "@/lib/game-form";
import { parseScoreForm } from "@/lib/score-form";
import {
  createGame,
  deleteGame,
  deleteGamePicks,
  getGame,
  setScore,
  updateGame,
  type GameProblem,
} from "@/models/admin-games";

export type GameFormState = { ok: boolean; message: string } | null;

const PROBLEMS: Record<GameProblem, string> = {
  "not-found": "That game or week isn't in the current season.",
  "unknown-team": "Choose active teams.",
  "different-leagues": "Both teams must be in the same league.",
  official:
    "This game is final, so it can't be changed here. Its results depend on the spread and score.",
  "teams-locked":
    "Players have picked this game, so its teams can't be replaced. You can still swap the favorite and underdog.",
  "has-picks": "Players have picked this game, so it can't be deleted.",
  "not-started": "This game hasn't kicked off yet, so it can't have a score.",
};

const NOT_ADMIN = { ok: false, message: "Only admins can change games." };

/** Adds a game to the week (weekId bound), then shows the week. */
export async function addGame(
  weekId: number,
  _: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseGameForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result;
  try {
    result = await createGame(weekId, parsed.game);
  } catch (error) {
    console.error("createGame failed", error);
    return { ok: false, message: "Couldn't add the game. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/weeks/${result.weekId}?gameSaved=${result.gameId}`);
}

/** Updates a game (gameId bound), then shows its week. */
export async function editGame(
  gameId: number,
  _: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseGameForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result;
  try {
    result = await updateGame(gameId, parsed.game);
  } catch (error) {
    console.error("updateGame failed", error);
    return { ok: false, message: "Couldn't save the game. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/weeks/${result.weekId}?gameSaved=${result.gameId}`);
}

/** Deletes a game (gameId bound) that isn't final and has no picks. */
export async function removeGame(
  gameId: number,
  _: GameFormState,
): Promise<GameFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can delete games." };

  let result;
  try {
    result = await deleteGame(gameId);
  } catch (error) {
    console.error("deleteGame failed", error);
    return { ok: false, message: "Couldn't delete the game. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/weeks/${result.weekId}?gameDeleted=1`);
}

/**
 * Sets a game's score (gameId bound), which also rebuilds the standings,
 * then shows its week.
 */
export async function scoreGame(
  gameId: number,
  _: GameFormState,
  formData: FormData,
): Promise<GameFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can set scores." };
  const game = await getGame(gameId);
  if (!game) return { ok: false, message: PROBLEMS["not-found"] };
  const parsed = parseScoreForm(formData, game.spread);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result;
  try {
    result = await setScore(gameId, parsed.score);
  } catch (error) {
    console.error("setScore failed", error);
    return {
      ok: false,
      message: "Couldn't save the score or update the standings, so nothing was changed. Please try again.",
    };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/weeks/${result.weekId}?gameScored=${gameId}`);
}

/** Deletes all picks on a game (gameId bound) that isn't final, then reloads its page. */
export async function removeGamePicks(
  gameId: number,
  _: GameFormState,
): Promise<GameFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can delete picks." };

  let result;
  try {
    result = await deleteGamePicks(gameId);
  } catch (error) {
    console.error("deleteGamePicks failed", error);
    return { ok: false, message: "Couldn't delete the picks. Please try again." };
  }
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.problem === "official"
          ? "This game is final, so its picks can't be deleted."
          : PROBLEMS[result.problem],
    };
  }
  redirect(`/admin/weeks/${result.weekId}/games/${gameId}?picksDeleted=${result.deleted}`);
}
