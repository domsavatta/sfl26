import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInUser: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock("@/models/user", () => ({ signInUser: mocks.signInUser }));
vi.mock("@/lib/session", () => ({
  createSession: mocks.createSession,
  deleteSession: mocks.deleteSession,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const { signin, signout } = await import("./auth");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("signin", () => {
  test("signs in and returns to the page the player came from", async () => {
    const user = { playerId: 24, playerName: "Mark E" };
    mocks.signInUser.mockResolvedValue(user);

    await expect(
      signin(null, form({ name: "Mark E", password: "pw", next: "/view-picks?sort=name" })),
    ).rejects.toThrow("REDIRECT /view-picks?sort=name");
    expect(mocks.createSession).toHaveBeenCalledWith(user);
  });

  test("goes home when next is missing or another site", async () => {
    mocks.signInUser.mockResolvedValue({ playerId: 24, playerName: "Mark E" });
    await expect(signin(null, form({ name: "a", password: "b" }))).rejects.toThrow("REDIRECT /");
    await expect(
      signin(null, form({ name: "a", password: "b", next: "https://evil.example" })),
    ).rejects.toThrow(/^REDIRECT \/$/);
  });

  test("a wrong password returns an error, keeps the name, and doesn't sign in", async () => {
    mocks.signInUser.mockResolvedValue(null);
    expect(await signin(null, form({ name: "Mark E", password: "nope", next: "/standings" }))).toEqual({
      message: "Invalid username or password",
      name: "Mark E",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("signout", () => {
  test("from the header: signs out and goes home", async () => {
    await expect(signout(form({}))).rejects.toThrow(/^REDIRECT \/$/);
    expect(mocks.deleteSession).toHaveBeenCalled();
  });

  test("from the sign-in page: stays there, keeping where to go next", async () => {
    await expect(signout(form({ next: "/make-picks" }))).rejects.toThrow(
      "REDIRECT /sign-in?next=%2Fmake-picks",
    );
    expect(mocks.deleteSession).toHaveBeenCalled();
  });
});
