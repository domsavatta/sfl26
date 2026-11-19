import type { ScoreInput } from "@/models/admin-games";

/** Who covered the spread. */
export type GameResult = "favorite" | "underdog" | "push";

const MAX_SCORE = 999;
const MAX_STATUS = 200; // Game.Status is varchar(200)

/** Who covered, from the scores and spread (spread 0 is a pick'em). */
export function coverResult(
  favoriteScore: number,
  underdogScore: number,
  spread: number,
): GameResult {
  const margin = favoriteScore - underdogScore;
  if (margin > spread) return "favorite";
  if (margin < spread) return "underdog";
  return "push";
}

/**
 * Reads the score form: favoriteScore, underdogScore (both blank to clear),
 * status (optional), result ("favorite" | "underdog" | "push"; defaults to
 * the result by the score), official ("on" when final).
 */
export function parseScoreForm(
  formData: FormData,
  spread: number,
): { score: ScoreInput } | { error: string } {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const scoreOf = (name: string) => {
    const value = text(name);
    if (!value) return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= MAX_SCORE ? n : NaN;
  };

  const favoriteScore = scoreOf("favoriteScore");
  const underdogScore = scoreOf("underdogScore");
  const official = formData.get("official") === "on";
  if (Number.isNaN(favoriteScore) || Number.isNaN(underdogScore)) {
    return { error: `Scores must be whole numbers from 0 to ${MAX_SCORE}.` };
  }
  if ((favoriteScore === null) !== (underdogScore === null)) {
    return { error: "Enter both scores, or neither." };
  }
  if (official && favoriteScore === null) {
    return { error: "A final game needs both scores." };
  }

  const status = text("status");
  if (status.length > MAX_STATUS) {
    return { error: `The status must be at most ${MAX_STATUS} characters.` };
  }

  let result: GameResult | null = null;
  if (favoriteScore !== null && underdogScore !== null) {
    const chosen = text("result");
    result =
      chosen === "favorite" || chosen === "underdog" || chosen === "push"
        ? chosen
        : coverResult(favoriteScore, underdogScore, spread);
  }

  return {
    score: {
      favoriteScore,
      underdogScore,
      status: status || null,
      result,
      official,
    },
  };
}
