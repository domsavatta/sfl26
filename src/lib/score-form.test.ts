import { describe, expect, test } from "vitest";
import { coverResult, parseScoreForm } from "./score-form";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("coverResult", () => {
  test("favorite must win by more than the spread", () => {
    expect(coverResult(31, 27, 3.5)).toBe("favorite");
    expect(coverResult(30, 27, 3.5)).toBe("underdog");
    expect(coverResult(20, 27, 3.5)).toBe("underdog");
  });

  test("winning by exactly the spread is a push", () => {
    expect(coverResult(24, 21, 3)).toBe("push");
    expect(coverResult(17, 17, 0)).toBe("push");
  });

  test("pick'em: the winner covers", () => {
    expect(coverResult(10, 7, 0)).toBe("favorite");
    expect(coverResult(7, 10, 0)).toBe("underdog");
  });
});

describe("parseScoreForm", () => {
  test("a final score, with the result from the score by default", () => {
    expect(
      parseScoreForm(form({ favoriteScore: "31", underdogScore: "27", status: "Final", official: "on" }), 3.5),
    ).toEqual({
      score: { favoriteScore: 31, underdogScore: 27, status: "Final", result: "favorite", official: true },
    });
  });

  test("the result can be overridden", () => {
    const parsed = parseScoreForm(form({ favoriteScore: "31", underdogScore: "27", result: "push" }), 3.5);
    expect(parsed).toMatchObject({ score: { result: "push", official: false } });
  });

  test("an in-progress score", () => {
    expect(
      parseScoreForm(form({ favoriteScore: "14", underdogScore: "3", status: " 2nd Qtr 4:10 " }), 7),
    ).toEqual({
      score: { favoriteScore: 14, underdogScore: 3, status: "2nd Qtr 4:10", result: "favorite", official: false },
    });
  });

  test("both scores blank clears the score", () => {
    expect(parseScoreForm(form({ favoriteScore: "", underdogScore: "", result: "favorite" }), 3)).toEqual({
      score: { favoriteScore: null, underdogScore: null, status: null, result: null, official: false },
    });
  });

  test("rejects one score, bad scores and a final game without scores", () => {
    expect(parseScoreForm(form({ favoriteScore: "7", underdogScore: "" }), 3)).toEqual({
      error: "Enter both scores, or neither.",
    });
    for (const bad of ["-1", "1.5", "abc", "1000"]) {
      expect(parseScoreForm(form({ favoriteScore: bad, underdogScore: "7" }), 3)).toHaveProperty("error");
    }
    expect(parseScoreForm(form({ official: "on" }), 3)).toEqual({ error: "A final game needs both scores." });
  });
});
