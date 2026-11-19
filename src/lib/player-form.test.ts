import { describe, expect, test } from "vitest";
import { parsePlayerForm } from "./player-form";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

describe("parsePlayerForm", () => {
  test("reads a player", () => {
    expect(
      parsePlayerForm(
        form({
          name: "  Pat  S ",
          firstName: "Pat",
          lastName: "Smith",
          email: "pat@example.com",
          profile: "  Likes\n  the Bills ",
          inSeason: "on",
          admin: "on",
        }),
      ),
    ).toEqual({
      player: {
        name: "Pat S",
        firstName: "Pat",
        lastName: "Smith",
        email: "pat@example.com",
        profile: "Likes\n  the Bills",
        hidden: false,
        inSeason: true,
        admin: true,
      },
    });
  });

  test("only the name is required", () => {
    expect(parsePlayerForm(form({ name: "Pat", hidden: "on" }))).toEqual({
      player: {
        name: "Pat",
        firstName: null,
        lastName: null,
        email: null,
        profile: null,
        hidden: true,
        inSeason: false,
        admin: false,
      },
    });
    expect(parsePlayerForm(form({ name: " " }))).toHaveProperty("error");
  });

  test("checks the email and lengths", () => {
    expect(parsePlayerForm(form({ name: "Pat", email: "not-an-email" }))).toEqual({
      error: "Enter a valid email address.",
    });
    expect(parsePlayerForm(form({ name: "x".repeat(51) }))).toHaveProperty("error");
    expect(parsePlayerForm(form({ name: "Pat", lastName: "x".repeat(251) }))).toHaveProperty("error");
    expect(parsePlayerForm(form({ name: "Pat", profile: "x".repeat(4001) }))).toHaveProperty("error");
  });
});
