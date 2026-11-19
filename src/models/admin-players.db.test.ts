import sql from "mssql";
import { describe, expect, test } from "vitest";
import { validate } from "@/lib/asp-dot-net-password";
import { createFixtures, insertPick, testRequest } from "../../test/db";
import {
  createPlayer,
  deletePlayer,
  getPlayer,
  getPlayers,
  resetPassword,
  updatePlayer,
  type PlayerInput,
} from "./admin-players";
import { signInUser } from "./user";

const DEFAULT = "test-default-password";

const setup = createFixtures;

const input = (change: Partial<PlayerInput> = {}): PlayerInput => ({
  name: "Test New Player",
  firstName: "Test",
  lastName: "Player",
  email: "new@example.com",
  profile: "Likes the underdog",
  hidden: false,
  inSeason: true,
  admin: false,
  ...change,
});

async function roles(playerId: number) {
  const result = await testRequest()
    .input("playerId", sql.Int, playerId)
    .query<{ roleId: number }>(`select RoleId roleId from webpages_UsersInRoles where UserId = @playerId order by RoleId`);
  return result.recordset.map((r: { roleId: number }) => r.roleId);
}

async function inSeason(playerId: number, seasonId: number) {
  const result = await testRequest().query(
    `select count(*) n from PlayersSeason where PlayerId = ${playerId} and SeasonID = ${seasonId}`,
  );
  return result.recordset[0].n === 1;
}

async function membership(playerId: number) {
  const result = await testRequest()
    .input("playerId", sql.Int, playerId)
    .query(`select Password password, PasswordFailuresSinceLastSuccess failures
      from webpages_Membership where UserId = @playerId`);
  return result.recordset[0] as { password: string; failures: number } | undefined;
}

/** A fixture player with a login (the fixture doesn't create one). */
async function withLogin(playerId: number) {
  await testRequest().query(
    `insert into webpages_Membership (UserId, Password, PasswordSalt, PasswordFailuresSinceLastSuccess)
     values (${playerId}, 'not-a-real-hash', '', 3)`,
  );
}

describe("createPlayer", () => {
  test("adds a player who can sign in with the default password, in the season", async () => {
    const f = await setup();

    const result = await createPlayer(input(), DEFAULT);

    expect(result.ok).toBe(true);
    const playerId = result.ok ? result.playerId : 0;
    expect(await getPlayer(playerId)).toMatchObject({
      name: "Test New Player",
      firstName: "Test",
      lastName: "Player",
      email: "new@example.com",
      profile: "Likes the underdog",
      hidden: false,
      inSeason: true,
      admin: false,
      seasonPicks: 0,
      hasLogin: true,
    });
    expect(await inSeason(playerId, f.seasonId)).toBe(true);
    expect(await roles(playerId)).toEqual([]); // season sign-up is PlayersSeason only
    expect(await signInUser("Test New Player", DEFAULT)).toMatchObject({ playerId });
  });

  test("an admin, not in the season", async () => {
    const f = await setup();
    const result = await createPlayer(input({ inSeason: false, admin: true }), DEFAULT);
    const playerId = result.ok ? result.playerId : 0;
    expect(await inSeason(playerId, f.seasonId)).toBe(false);
    expect(await roles(playerId)).toEqual([1]);
  });

  test("names are unique", async () => {
    await setup();
    expect(await createPlayer(input({ name: "Test Player" }), DEFAULT)).toEqual({
      ok: false,
      problem: "duplicate-name",
    });
  });
});

describe("updatePlayer", () => {
  test("changes details, season and admin, and lists the player", async () => {
    const f = await setup();
    const created = await createPlayer(input(), DEFAULT);
    const playerId = created.ok ? created.playerId : 0;

    const result = await updatePlayer(
      playerId,
      input({ name: "Test Renamed", email: null, profile: null, hidden: true, inSeason: false, admin: true }),
      f.playerId,
    );

    expect(result).toEqual({ ok: true, playerId });
    expect(await getPlayer(playerId)).toMatchObject({
      name: "Test Renamed",
      email: null,
      profile: null,
      hidden: true,
      inSeason: false,
      admin: true,
    });
    expect(await roles(playerId)).toEqual([1]);
    expect((await getPlayers()).find((p) => p.playerId === playerId)).toMatchObject({ name: "Test Renamed" });
  });

  test("can't remove a player with picks this season from it", async () => {
    const f = await setup();
    await insertPick(f.playerId, f.games.a1, f.teams[0]);
    expect((await getPlayer(f.playerId))?.seasonPicks).toBe(1);

    expect(
      await updatePlayer(f.playerId, input({ name: "Test Player", inSeason: false }), f.outsiderId),
    ).toEqual({ ok: false, problem: "has-picks" });
    expect(await inSeason(f.playerId, f.seasonId)).toBe(true);
  });

  test("an admin can't remove their own admin role or hide themselves", async () => {
    const f = await setup();
    await withLogin(f.playerId);
    const me = { name: "Test Player", inSeason: true };
    expect(await updatePlayer(f.playerId, input({ ...me, admin: false }), f.playerId)).toEqual({
      ok: false,
      problem: "self",
    });
    expect(await updatePlayer(f.playerId, input({ ...me, admin: true, hidden: true }), f.playerId)).toEqual({
      ok: false,
      problem: "self",
    });
    expect((await updatePlayer(f.playerId, input({ ...me, admin: true }), f.playerId)).ok).toBe(true);
  });

  test("can't take another player's name", async () => {
    const f = await setup();
    expect(await updatePlayer(f.outsiderId, input({ name: "Test Player" }), f.playerId)).toEqual({
      ok: false,
      problem: "duplicate-name",
    });
  });
});

describe("resetPassword", () => {
  test("sets the default password and clears failed attempts", async () => {
    const f = await setup();
    await withLogin(f.playerId);

    expect(await resetPassword(f.playerId, DEFAULT)).toEqual({ ok: true, playerId: f.playerId });

    const login = await membership(f.playerId);
    expect(validate(DEFAULT, login!.password)).toBe(true);
    expect(login!.failures).toBe(0);
    expect(await signInUser("Test Player", DEFAULT)).toMatchObject({ playerId: f.playerId });
  });

  test("creates a login for a player without one", async () => {
    const f = await setup();
    expect(await membership(f.outsiderId)).toBeUndefined();
    await resetPassword(f.outsiderId, DEFAULT);
    expect(validate(DEFAULT, (await membership(f.outsiderId))!.password)).toBe(true);
  });

  test("not-found for a missing player", async () => {
    expect(await resetPassword(2_000_000_000, DEFAULT)).toEqual({ ok: false, problem: "not-found" });
  });
});

describe("deletePlayer", () => {
  test("deletes a player with no picks or standings, with their login, roles and seasons", async () => {
    const f = await setup();
    const created = await createPlayer(input({ admin: true }), DEFAULT);
    const playerId = created.ok ? created.playerId : 0;
    expect(await getPlayer(playerId)).toMatchObject({ totalPicks: 0, inStandings: false });

    expect(await deletePlayer(playerId, f.playerId)).toEqual({ ok: true, playerId });

    expect(await getPlayer(playerId)).toBeNull();
    expect(await membership(playerId)).toBeUndefined();
    expect(await roles(playerId)).toEqual([]);
    expect(await inSeason(playerId, f.seasonId)).toBe(false);
  });

  test("won't delete a player with picks, in the standings, or yourself", async () => {
    const f = await setup();
    await insertPick(f.playerId, f.games.a1, f.teams[0]);
    expect(await deletePlayer(f.playerId, f.outsiderId)).toEqual({ ok: false, problem: "has-picks" });

    await testRequest().query(
      `insert into WeekStanding (WeekID, PlayerId, Ranking) values (${f.weeks.open1}, ${f.outsiderId}, 1)`,
    );
    expect(await getPlayer(f.outsiderId)).toMatchObject({ totalPicks: 0, inStandings: true });
    expect(await deletePlayer(f.outsiderId, f.playerId)).toEqual({ ok: false, problem: "in-standings" });

    const created = await createPlayer(input(), DEFAULT);
    const me = created.ok ? created.playerId : 0;
    expect(await deletePlayer(me, me)).toEqual({ ok: false, problem: "self" });
    expect(await getPlayer(me)).not.toBeNull();
  });
});
