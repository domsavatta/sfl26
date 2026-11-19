import { describe, expect, test } from "vitest";
import { nextSeasonName, parseSeasonForm } from "./season-form";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("parseSeasonForm", () => {
  test("reads a season", () => {
    expect(
      parseSeasonForm(form({ name: " 2024  Season ", defaultPassword: "pick2024", makeCurrent: "on" })),
    ).toEqual({ season: { name: "2024 Season", defaultPassword: "pick2024", makeCurrent: true } });
  });

  test("needs a name and a default password of at most 10 characters", () => {
    expect(parseSeasonForm(form({ name: "", defaultPassword: "x" }))).toHaveProperty("error");
    expect(parseSeasonForm(form({ name: "2024 Season", defaultPassword: "  " }))).toHaveProperty("error");
    expect(parseSeasonForm(form({ name: "2024 Season", defaultPassword: "x".repeat(11) }))).toHaveProperty("error");
    expect(parseSeasonForm(form({ name: "2024 Season", defaultPassword: "null" }))).toHaveProperty("error");
  });
});

describe("nextSeasonName", () => {
  test("the year after the latest season", () => {
    expect(nextSeasonName("2023 Season", 2026)).toBe("2024 Season");
  });
  test("falls back when the latest name has no year", () => {
    expect(nextSeasonName("Season Duece", 2026)).toBe("2026 Season");
    expect(nextSeasonName(undefined, 2026)).toBe("2026 Season");
  });
});
