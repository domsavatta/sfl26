import sql from "mssql";
import { describe, expect, test } from "vitest";
import { createFixtures, testRequest } from "../../test/db";
import {
  createWeek,
  deleteWeek,
  getSeasonWeeks,
  getWeek,
  getWeekGames,
  isAdmin,
  updateWeek,
} from "./admin-weeks";

/** A week from a real season, which is no longer current once the fixture season exists. */
async function otherSeasonWeek(seasonId: number) {
  const result = await testRequest()
    .input("seasonId", sql.Int, seasonId)
    .query<{ weekId: number; name: string }>(
      `select top 1 WeekID weekId, Name name from Week where SeasonID <> @seasonId`,
    );
  return result.recordset[0];
}

async function weekRow(weekId: number) {
  const result = await testRequest()
    .input("weekId", sql.Int, weekId)
    .query(`select Name, Sort, SeasonID, Live, Official, HomeDisplay from Week where WeekID = @weekId`);
  return result.recordset[0];
}

describe("isAdmin", () => {
  test("only players with the admin role who aren't PNG", async () => {
    const f = await createFixtures();
    expect(await isAdmin(f.playerId)).toBe(false);

    // A role needs a login (webpages_Membership) row.
    await testRequest().query(`
      insert into webpages_Membership (UserId, Password, PasswordSalt) values (${f.playerId}, '', '');
      insert into webpages_UsersInRoles (UserId, RoleId) values (${f.playerId}, 1);`);
    expect(await isAdmin(f.playerId)).toBe(true);

    await testRequest().query(`update Player set PNG = 1 where PlayerId = ${f.playerId}`);
    expect(await isAdmin(f.playerId)).toBe(false);
  });
});

describe("getSeasonWeeks", () => {
  test("the current season's weeks in order, with game counts", async () => {
    const f = await createFixtures();
    const { season, weeks } = await getSeasonWeeks();

    expect(season).toEqual({ seasonId: f.seasonId, seasonName: "Test Season" });
    expect(weeks).toEqual([
      { weekId: f.weeks.open1, weekName: "Test Week 1", sort: 1, live: true, official: false, games: 3 },
      { weekId: f.weeks.open2, weekName: "Test Week 2", sort: 2, live: true, official: false, games: 3 },
      { weekId: f.weeks.official, weekName: "Test Official Week", sort: 3, live: true, official: true, games: 1 },
      { weekId: f.weeks.notLive, weekName: "Test Hidden Week", sort: 4, live: false, official: false, games: 1 },
    ]);
  });
});

describe("getWeek", () => {
  test("a week in the current season", async () => {
    const f = await createFixtures();
    expect(await getWeek(f.weeks.open2)).toMatchObject({ weekName: "Test Week 2", sort: 2 });
  });

  test("null for another season's week", async () => {
    const f = await createFixtures();
    expect(await getWeek((await otherSeasonWeek(f.seasonId)).weekId)).toBeNull();
  });
});

describe("createWeek", () => {
  test("adds a week to the current season", async () => {
    const f = await createFixtures();

    const result = await createWeek({ weekName: "Test Week 5", sort: 5, live: true, official: false });

    expect(result.ok).toBe(true);
    const weekId = result.ok ? result.weekId : 0;
    expect(await weekRow(weekId)).toEqual({
      Name: "Test Week 5",
      Sort: 5,
      SeasonID: f.seasonId,
      Live: true,
      Official: false,
      HomeDisplay: false,
    });
  });

  test("rejects a name or order already used this season", async () => {
    await createFixtures();
    expect(await createWeek({ weekName: "Test Week 1", sort: 9, live: false, official: false })).toEqual({
      ok: false,
      problem: "duplicate-name",
    });
    expect(await createWeek({ weekName: "Test Week 9", sort: 2, live: false, official: false })).toEqual({
      ok: false,
      problem: "duplicate-sort",
    });
    expect((await getSeasonWeeks()).weeks).toHaveLength(4);
  });

  test("a name used in another season is fine", async () => {
    const f = await createFixtures();
    const other = await otherSeasonWeek(f.seasonId);
    expect((await createWeek({ weekName: other.name, sort: 9, live: false, official: false })).ok).toBe(true);
  });
});

describe("updateWeek", () => {
  test("changes the name, order, live and official", async () => {
    const f = await createFixtures();

    const result = await updateWeek(f.weeks.notLive, {
      weekName: "Renamed",
      sort: 10,
      live: true,
      official: true,
    });

    expect(result).toEqual({ ok: true, weekId: f.weeks.notLive });
    expect(await weekRow(f.weeks.notLive)).toMatchObject({
      Name: "Renamed",
      Sort: 10,
      Live: true,
      Official: true,
    });
  });

  test("keeping its own name and order is fine", async () => {
    const f = await createFixtures();
    expect(
      await updateWeek(f.weeks.open1, { weekName: "Test Week 1", sort: 1, live: true, official: true }),
    ).toEqual({ ok: true, weekId: f.weeks.open1 });
  });

  test("rejects another week's name or order", async () => {
    const f = await createFixtures();
    const change = { live: true, official: false };
    expect(await updateWeek(f.weeks.open1, { ...change, weekName: "Test Week 2", sort: 1 })).toEqual({
      ok: false,
      problem: "duplicate-name",
    });
    expect(await updateWeek(f.weeks.open1, { ...change, weekName: "Test Week 1", sort: 2 })).toEqual({
      ok: false,
      problem: "duplicate-sort",
    });
    expect(await weekRow(f.weeks.open1)).toMatchObject({ Name: "Test Week 1", Sort: 1 });
  });

  test("won't change another season's week", async () => {
    const f = await createFixtures();
    const other = await otherSeasonWeek(f.seasonId);
    const before = await weekRow(other.weekId);

    expect(
      await updateWeek(other.weekId, { weekName: "Hacked", sort: 99, live: false, official: false }),
    ).toEqual({ ok: false, problem: "not-found" });
    expect(await weekRow(other.weekId)).toEqual(before);
  });

  test("not-found for a week that doesn't exist", async () => {
    await createFixtures();
    expect(
      await updateWeek(2_000_000_000, { weekName: "x", sort: 1, live: false, official: false }),
    ).toEqual({ ok: false, problem: "not-found" });
  });
});

describe("deleteWeek", () => {
  test("deletes a week with no games, and its standings rows", async () => {
    const f = await createFixtures();
    const created = await createWeek({ weekName: "Empty Week", sort: 9, live: true, official: false });
    const weekId = created.ok ? created.weekId : 0;
    await testRequest().query(
      `insert into WeekStanding (WeekID, PlayerId, Ranking) values (${weekId}, ${f.playerId}, 1)`,
    );

    expect(await deleteWeek(weekId)).toBe("ok");

    expect(await weekRow(weekId)).toBeUndefined();
    const left = await testRequest().query(`select count(*) n from WeekStanding where WeekID = ${weekId}`);
    expect(left.recordset[0].n).toBe(0);
    expect((await getSeasonWeeks()).weeks).toHaveLength(4);
  });

  test("won't delete a week with games", async () => {
    const f = await createFixtures();
    expect(await deleteWeek(f.weeks.notLive)).toBe("has-games");
    expect(await weekRow(f.weeks.notLive)).toBeDefined();
  });

  test("won't delete another season's week", async () => {
    const f = await createFixtures();
    const other = await otherSeasonWeek(f.seasonId);
    expect(await deleteWeek(other.weekId)).toBe("not-found");
    expect(await weekRow(other.weekId)).toBeDefined();
  });

  test("not-found for a week that doesn't exist", async () => {
    await createFixtures();
    expect(await deleteWeek(2_000_000_000)).toBe("not-found");
  });
});

describe("getWeekGames", () => {
  test("the week's games by gametime, with live pick counts", async () => {
    const f = await createFixtures();
    await testRequest().query(`
      insert into Pick (PlayerId, GameID, Pick, Updated, GOW) values
        (${f.playerId}, ${f.games.a1}, ${f.teams[1]}, getdate(), 0),
        (${f.outsiderId}, ${f.games.a1}, ${f.teams[1]}, getdate(), 0),
        (${f.playerId}, ${f.games.a2}, ${f.teams[2]}, getdate(), 0)`);

    const games = await getWeekGames(f.weeks.open1);

    expect(games.map((g) => g.gameId)).toEqual([f.games.startedA, f.games.a1, f.games.a2]);
    expect(games[0]).toMatchObject({ started: true, league: "NFL", spread: 3.5 });
    expect(games[0].favorite).toMatchObject({ teamId: f.teams[0], name: "Test Team 1", location: "Home" });
    expect(games[1]).toMatchObject({ started: false, favoritePicks: 0, underdogPicks: 2 });
    expect(games[2]).toMatchObject({ favoritePicks: 1, underdogPicks: 0 });
    expect(games[2].underdog.location).toBe("Home"); // FavoriteSite 2: underdog at home
  });

  test("nothing for another season's week", async () => {
    const f = await createFixtures();
    expect(await getWeekGames((await otherSeasonWeek(f.seasonId)).weekId)).toEqual([]);
  });
});
