import { describe, expect, test } from "vitest";
import { nextSeasonName, parseEditSeasonForm, parseSeasonForm } from "./season-form";

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

describe("parseEditSeasonForm", () => {
  test("reads a name, sort order and new password (as typed)", () => {
    expect(parseEditSeasonForm(form({ name: " 2024  Season ", sort: " 23 ", defaultPassword: " pw 2 " }))).toEqual({
      season: { name: "2024 Season", sort: 23, defaultPassword: " pw 2 " },
    });
  });

  test("a blank password keeps the current one", () => {
    expect(parseEditSeasonForm(form({ name: "2024 Season", sort: "-1", defaultPassword: "" }))).toEqual({
      season: { name: "2024 Season", sort: -1, defaultPassword: null },
    });
  });

  test("needs a name, a whole-number sort order and a usable password", () => {
    const edit = (fields: Record<string, string>) =>
      parseEditSeasonForm(form({ name: "2024 Season", sort: "1", defaultPassword: "", ...fields }));
    expect(edit({ name: " " })).toHaveProperty("error");
    expect(edit({ name: "x".repeat(51) })).toHaveProperty("error");
    expect(edit({ sort: "" })).toHaveProperty("error");
    expect(edit({ sort: "1.5" })).toHaveProperty("error");
    expect(edit({ sort: "abc" })).toHaveProperty("error");
    expect(edit({ sort: "99999999999" })).toHaveProperty("error");
    expect(edit({ defaultPassword: "  " })).toHaveProperty("error");
    expect(edit({ defaultPassword: "x".repeat(11) })).toHaveProperty("error");
    expect(edit({ defaultPassword: "NULL" })).toHaveProperty("error");
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
