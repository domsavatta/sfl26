import { describe, expect, test } from "vitest";
import { parseGameForm, toGametimeInput } from "./game-form";

const valid = {
  favoriteId: "5",
  underdogId: "12",
  favoriteSite: "1",
  spread: "3.5",
  gametime: "2026-12-13T13:00",
  storyline: "  Rivalry game  ",
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("parseGameForm", () => {
  test("reads a game", () => {
    expect(parseGameForm(form(valid))).toEqual({
      game: {
        favoriteId: 5,
        underdogId: 12,
        favoriteSite: 1,
        spread: 3.5,
        gametime: "2026-12-13T13:00",
        storyline: "Rivalry game",
      },
    });
  });

  test("a blank storyline is null; 0 is a pick'em", () => {
    const result = parseGameForm(form({ ...valid, storyline: " ", spread: "0" }));
    expect(result).toMatchObject({ game: { storyline: null, spread: 0 } });
  });

  test("needs two different teams", () => {
    expect(parseGameForm(form({ ...valid, underdogId: "" }))).toEqual({ error: "Choose both teams." });
    expect(parseGameForm(form({ ...valid, underdogId: "5" }))).toEqual({
      error: "The favorite and underdog must be different teams.",
    });
  });

  test("needs a site of 1, 2 or 3", () => {
    for (const favoriteSite of ["", "0", "4", "home"]) {
      expect(parseGameForm(form({ ...valid, favoriteSite }))).toEqual({
        error: "Choose where the game is played.",
      });
    }
  });

  test("spreads are 0 to 99.5 in half points", () => {
    for (const spread of ["7", "10.5", "99.5"]) {
      expect("game" in parseGameForm(form({ ...valid, spread }))).toBe(true);
    }
    for (const spread of ["", "-3", "3.25", "100", "abc"]) {
      expect(parseGameForm(form({ ...valid, spread }))).toHaveProperty("error");
    }
  });

  test("needs a real date and time", () => {
    for (const gametime of ["", "2026-12-13", "2026-02-30T13:00", "2026-12-13T25:00", "13/12/2026 1pm"]) {
      expect(parseGameForm(form({ ...valid, gametime }))).toEqual({
        error: "Enter the kickoff date and time.",
      });
    }
  });

  test("storyline up to 2000 characters", () => {
    expect(parseGameForm(form({ ...valid, storyline: "x".repeat(2001) }))).toHaveProperty("error");
  });
});

describe("toGametimeInput", () => {
  test("uses the stored Eastern time, not the machine's time zone", () => {
    expect(toGametimeInput(new Date(Date.UTC(2026, 11, 13, 13, 0)))).toBe("2026-12-13T13:00");
  });
});
