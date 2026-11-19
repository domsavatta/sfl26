import { describe, expect, test } from "vitest";
import { checkEmail, checkNewPassword } from "./account-validation";

describe("checkEmail", () => {
  test("accepts ordinary addresses", () => {
    expect(checkEmail("pat@example.com")).toBeNull();
    expect(checkEmail("pat.smith+sfl@mail.example.co.uk")).toBeNull();
  });

  test("rejects empty, malformed and overlong addresses", () => {
    expect(checkEmail("")).toBe("Enter an email address.");
    for (const bad of ["pat", "pat@", "@example.com", "pat@example", "pat smith@example.com"]) {
      expect(checkEmail(bad)).toBe("Enter a valid email address.");
    }
    expect(checkEmail(`${"a".repeat(240)}@example.com`)).toBe("That email address is too long.");
  });
});

describe("checkNewPassword", () => {
  test("accepts a long enough, confirmed, new password", () => {
    expect(checkNewPassword("old-password", "new-password", "new-password")).toBeNull();
  });

  test("too short or too long", () => {
    expect(checkNewPassword("old", "short", "short")).toMatch(/at least 8/);
    const long = "x".repeat(129);
    expect(checkNewPassword("old", long, long)).toMatch(/at most 128/);
  });

  test("must match the confirmation", () => {
    expect(checkNewPassword("old", "new-password", "new-passw0rd")).toBe(
      "The new passwords don't match.",
    );
  });

  test("must be different from the current password", () => {
    expect(checkNewPassword("same-password", "same-password", "same-password")).toMatch(
      /different/,
    );
  });
});
