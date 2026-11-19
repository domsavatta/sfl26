import type { GameInput } from "@/models/admin-games";

const MAX_SPREAD = 99.5;
const MAX_STORYLINE = 2000; // Game.Storyline is varchar(2000)

/**
 * Reads the add/edit game form:
 *   favoriteId, underdogId  team ids (different teams)
 *   favoriteSite            1 favorite at home, 2 underdog at home, 3 neutral
 *   spread                  0 to 99.5 in half points; 0 is a pick'em
 *   gametime                "YYYY-MM-DDTHH:mm", US Eastern wall-clock time
 *   storyline               optional
 */
export function parseGameForm(
  formData: FormData,
): { game: GameInput } | { error: string } {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const id = (name: string) => {
    const n = Number(text(name));
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const favoriteId = id("favoriteId");
  const underdogId = id("underdogId");
  if (!favoriteId || !underdogId) return { error: "Choose both teams." };
  if (favoriteId === underdogId) {
    return { error: "The favorite and underdog must be different teams." };
  }

  const site = Number(text("favoriteSite"));
  if (site !== 1 && site !== 2 && site !== 3) {
    return { error: "Choose where the game is played." };
  }

  const spreadText = text("spread");
  const spread = Number(spreadText);
  if (
    !spreadText ||
    !Number.isFinite(spread) ||
    spread < 0 ||
    spread > MAX_SPREAD ||
    !Number.isInteger(spread * 2)
  ) {
    return { error: "The spread must be 0 to 99.5, in half points (0 is a pick'em)." };
  }

  const gametime = text("gametime");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(gametime);
  const valid =
    match &&
    (() => {
      const [, y, mo, d, h, mi] = match.map(Number);
      const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
      return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === mo - 1 &&
        date.getUTCDate() === d &&
        h < 24 &&
        mi < 60 &&
        y >= 2000 &&
        y <= 2100
      );
    })();
  if (!valid) return { error: "Enter the kickoff date and time." };

  const storyline = text("storyline");
  if (storyline.length > MAX_STORYLINE) {
    return { error: `The storyline must be at most ${MAX_STORYLINE} characters.` };
  }

  return {
    game: {
      favoriteId,
      underdogId,
      favoriteSite: site as 1 | 2 | 3,
      spread,
      gametime,
      storyline: storyline || null,
    },
  };
}

/** A gametime Date (Eastern time in its UTC fields) as a datetime-local value. */
export const toGametimeInput = (gametime: Date) =>
  gametime.toISOString().slice(0, 16);
