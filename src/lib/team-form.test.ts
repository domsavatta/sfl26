import { describe, expect, test } from "vitest";
import { parseTeamForm } from "./team-form";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("parseTeamForm", () => {
  test("reads a team, tidying spaces", () => {
    expect(
      parseTeamForm(form({ name: "  Coastal   Carolina ", league: "College", abbreviation: " CCU ", active: "on" })),
    ).toEqual({ team: { name: "Coastal Carolina", league: "College", abbreviation: "CCU", active: true } });
  });

  test("abbreviation is optional; unchecked is inactive", () => {
    expect(parseTeamForm(form({ name: "Buffalo", league: "NFL", abbreviation: "" }))).toEqual({
      team: { name: "Buffalo", league: "NFL", abbreviation: null, active: false },
    });
  });

  test("needs a name and a known league", () => {
    expect(parseTeamForm(form({ name: " ", league: "NFL" }))).toEqual({ error: "Enter the team's name." });
    for (const league of ["", "nfl", "MLB"]) {
      expect(parseTeamForm(form({ name: "Buffalo", league }))).toEqual({
        error: "Choose a league: NFL or College.",
      });
    }
  });

  test("length limits", () => {
    expect(parseTeamForm(form({ name: "x".repeat(101), league: "NFL" }))).toHaveProperty("error");
    expect(parseTeamForm(form({ name: "Buffalo", league: "NFL", abbreviation: "x".repeat(21) }))).toHaveProperty(
      "error",
    );
  });
});
