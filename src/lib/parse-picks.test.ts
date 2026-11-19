import { describe, expect, test } from "vitest";
import { parsePicksForm } from "./parse-picks";

const form = (fields: [string, string][]) => {
  const data = new FormData();
  for (const [key, value] of fields) data.append(key, value);
  return data;
};

describe("parsePicksForm", () => {
  test("reads picks and one lock per week", () => {
    const result = parsePicksForm(
      form([
        ["pick-101", "5"],
        ["pick-102", "8"],
        ["pick-201", "3"],
        ["lock-1", "102"],
        ["lock-2", "201"],
      ]),
    );
    expect(result).toEqual({
      picks: [
        { gameId: 101, teamId: 5, isLock: false },
        { gameId: 102, teamId: 8, isLock: true },
        { gameId: 201, teamId: 3, isLock: true },
      ],
    });
  });

  test("a lock needs a pick in that game", () => {
    expect(parsePicksForm(form([["pick-101", "5"], ["lock-1", "102"]]))).toEqual({
      error: "Pick a team in your lock game.",
    });
  });

  test("needs at least one pick", () => {
    expect(parsePicksForm(form([]))).toEqual({ error: "Make at least one pick." });
  });

  test("ignores other fields and bad ids", () => {
    const result = parsePicksForm(
      form([
        ["$ACTION_ID_abc", "x"],
        ["playerId", "99"],
        ["pick-101", "5"],
        ["pick-102", "-3"],
        ["pick-103", "abc"],
        ["pick-104", "1.5"],
        ["pickx-105", "5"],
      ]),
    );
    expect(result).toEqual({ picks: [{ gameId: 101, teamId: 5, isLock: false }] });
  });
});
