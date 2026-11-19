import { describe, expect, test } from "vitest";
import { formatGametime, formatPct, formatPoints, line, toInt } from "./format";

describe("formatGametime", () => {
  test("shows the stored Eastern wall-clock time, labeled ET", () => {
    // Stored 1:00 PM Eastern; the driver puts it in the UTC fields.
    const gametime = new Date(Date.UTC(2026, 10, 29, 13, 0));
    expect(formatGametime(gametime)).toMatch(/^Sun, Nov 29, 1:00\sPM ET$/);
  });

  test("doesn't shift with the machine's time zone", () => {
    const gametime = new Date(Date.UTC(2026, 6, 4, 20, 30));
    expect(formatGametime(gametime)).toMatch(/^Sat, Jul 4, 8:30\sPM ET$/);
  });
});

describe("line", () => {
  test("favorite gives points, underdog gets them", () => {
    expect(line({ spread: 3.5 }, "favorite")).toBe("-3.5");
    expect(line({ spread: 3.5 }, "underdog")).toBe("+3.5");
  });

  test("no spread is a pick'em", () => {
    expect(line({ spread: null }, "favorite")).toBe("PK");
    expect(line({ spread: 0 }, "underdog")).toBe("PK");
  });
});

describe("formatPct", () => {
  test("baseball style", () => {
    expect(formatPct({ wins: 35, losses: 12, winPercentage: 0.7447 })).toBe(".745");
    expect(formatPct({ wins: 4, losses: 0, winPercentage: 1 })).toBe("1.000");
  });

  test("dash with no games", () => {
    expect(formatPct({ wins: 0, losses: 0, winPercentage: 0 })).toBe("—");
  });
});

describe("formatPoints", () => {
  test("at most one decimal", () => {
    expect(formatPoints(39.299999)).toBe("39.3");
    expect(formatPoints(12)).toBe("12");
  });
});

describe("toInt", () => {
  test("positive integers", () => {
    expect(toInt("5")).toBe(5);
    expect(toInt(["7", "8"])).toBe(7);
  });

  test("anything else is null", () => {
    for (const value of [undefined, "", "0", "-1", "2.5", "abc", []]) {
      expect(toInt(value)).toBeNull();
    }
  });
});
