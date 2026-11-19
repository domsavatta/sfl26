import { describe, expect, test } from "vitest";
import { safeRedirectPath, signInHref } from "./redirect-path";

describe("safeRedirectPath", () => {
  test("keeps paths on this site, with their query", () => {
    expect(safeRedirectPath("/make-picks")).toBe("/make-picks");
    expect(safeRedirectPath("/view-picks?season=3&week=8443")).toBe(
      "/view-picks?season=3&week=8443",
    );
  });

  test("falls back for anything else", () => {
    for (const value of [
      undefined,
      null,
      "",
      "make-picks",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/sign-in",
      "/sign-in?next=/standings",
    ]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  test("uses the given fallback", () => {
    expect(safeRedirectPath("//evil.example", "/standings")).toBe("/standings");
  });
});

describe("signInHref", () => {
  test("returns to the page", () => {
    expect(signInHref("/view-picks?week=8443&sort=name")).toBe(
      "/sign-in?next=%2Fview-picks%3Fweek%3D8443%26sort%3Dname",
    );
  });

  test("plain sign-in for home, the sign-in page and bad paths", () => {
    expect(signInHref("/")).toBe("/sign-in");
    expect(signInHref("/sign-in?next=/standings")).toBe("/sign-in");
    expect(signInHref("//evil.example")).toBe("/sign-in");
  });
});
