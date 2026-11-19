import { describe, expect, test } from "vitest";
import { defaultWeekName, parseWeekForm } from "./week-form";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("defaultWeekName", () => {
  test("pads to two digits like existing weeks", () => {
    expect(defaultWeekName(7)).toBe("Week 07");
    expect(defaultWeekName(17)).toBe("Week 17");
  });
});

describe("parseWeekForm", () => {
  test("reads the fields; checkboxes are on or missing", () => {
    expect(parseWeekForm(form({ weekName: " Week 17 ", sort: "17", live: "on" }))).toEqual({
      week: { weekName: "Week 17", sort: 17, live: true, official: false },
    });
    expect(
      parseWeekForm(form({ weekName: "Bowls", sort: "18", live: "on", official: "on" })),
    ).toEqual({ week: { weekName: "Bowls", sort: 18, live: true, official: true } });
  });

  test("needs a name of at most 50 characters", () => {
    expect(parseWeekForm(form({ weekName: "  ", sort: "1" }))).toEqual({
      error: "Enter a week name.",
    });
    expect(parseWeekForm(form({ weekName: "x".repeat(51), sort: "1" }))).toEqual({
      error: "The week name must be at most 50 characters.",
    });
  });

  test("needs a whole-number order from 1 to 999", () => {
    for (const sort of ["", "0", "-1", "1.5", "abc", "1000"]) {
      expect(parseWeekForm(form({ weekName: "Week 17", sort }))).toEqual({
        error: "The order must be a whole number from 1 to 999.",
      });
    }
  });
});
