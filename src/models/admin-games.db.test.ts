import sql from "mssql";
import { describe, expect, test } from "vitest";
import { createFixtures, getPickCounts, insertPick, testRequest } from "../../test/db";
import {
  createGame,
  deleteGame,
  deleteGamePicks,
  getGame,
  getTeams,
  updateGame,
  type GameInput,
} from "./admin-games";

async function gameRow(gameId: number) {
  const result = await testRequest()
    .input("gameId", sql.Int, gameId)
    .query(`select FavoriteID, UnderdogID, convert(varchar(16), Gametime, 126) Gametime,
      FavoriteSite, Spread, WeekID, Storyline, Official, Tie, QualityPoints, DifficultyPoints
      from Game where GameID = @gameId`);
  return result.recordset[0];
}

/** A College team pair and an inactive NFL team, alongside the fixture's NFL teams. */
async function extraTeams() {
  const result = await testRequest().query(`
    declare @c1 int, @c2 int, @inactive int;
    insert into Team (Name, League) values ('Test College 1', 'College'); set @c1 = scope_identity();
    insert into Team (Name, League) values ('Test College 2', 'College'); set @c2 = scope_identity();
    insert into Team (Name, League, Active) values ('Test Inactive', 'NFL', 0); set @inactive = scope_identity();
    select @c1 c1, @c2 c2, @inactive inactive;`);
  return result.recordset[0] as { c1: number; c2: number; inactive: number };
}

const input = (f: Awaited<ReturnType<typeof createFixtures>>, change: Partial<GameInput> = {}): GameInput => ({
  favoriteId: f.teams[0],
  underdogId: f.teams[1],
  favoriteSite: 2,
  spread: 6.5,
  gametime: "2030-12-15T13:00",
  storyline: "Test storyline",
  ...change,
});

describe("getTeams", () => {
  test("active teams, plus a game's inactive team when asked", async () => {
    await createFixtures();
    const extra = await extraTeams();
    const ids = (await getTeams()).map((t) => t.teamId);
    expect(ids).toContain(extra.c1);
    expect(ids).not.toContain(extra.inactive);
    expect((await getTeams([extra.inactive])).map((t) => t.teamId)).toContain(extra.inactive);
  });
});

describe("createGame", () => {
  test("adds a game with the Eastern kickoff stored as typed", async () => {
    const f = await createFixtures();

    const result = await createGame(f.weeks.open2, input(f));

    expect(result.ok).toBe(true);
    const gameId = result.ok ? result.gameId : 0;
    expect(await gameRow(gameId)).toEqual({
      FavoriteID: f.teams[0],
      UnderdogID: f.teams[1],
      Gametime: "2030-12-15T13:00",
      FavoriteSite: 2,
      Spread: 6.5,
      WeekID: f.weeks.open2,
      Storyline: "Test storyline",
      Official: false,
      Tie: false,
      QualityPoints: 0,
      DifficultyPoints: 0,
    });
    expect(await getGame(gameId)).toMatchObject({ weekId: f.weeks.open2, picks: 0, spread: 6.5 });
  });

  test("rejects teams from different leagues, inactive teams, and other seasons' weeks", async () => {
    const f = await createFixtures();
    const extra = await extraTeams();
    expect(await createGame(f.weeks.open2, input(f, { underdogId: extra.c1 }))).toEqual({
      ok: false,
      problem: "different-leagues",
    });
    expect(await createGame(f.weeks.open2, input(f, { underdogId: extra.inactive }))).toEqual({
      ok: false,
      problem: "unknown-team",
    });
    expect(await createGame(f.weeks.open2, input(f, { underdogId: 2_000_000_000 }))).toEqual({
      ok: false,
      problem: "unknown-team",
    });
    const other = await testRequest().query(
      `select top 1 WeekID weekId from Week where SeasonID <> ${f.seasonId}`,
    );
    expect(await createGame(other.recordset[0].weekId, input(f))).toEqual({
      ok: false,
      problem: "not-found",
    });
  });
});

describe("updateGame", () => {
  test("changes everything on a game without picks", async () => {
    const f = await createFixtures();

    const result = await updateGame(
      f.games.b2,
      input(f, { favoriteId: f.teams[1], underdogId: f.teams[0], favoriteSite: 3, spread: 0, storyline: null }),
    );

    expect(result).toEqual({ ok: true, gameId: f.games.b2, weekId: f.weeks.open2 });
    expect(await gameRow(f.games.b2)).toMatchObject({
      FavoriteID: f.teams[1],
      UnderdogID: f.teams[0],
      FavoriteSite: 3,
      Spread: 0,
      Gametime: "2030-12-15T13:00",
      Storyline: null,
    });
  });

  test("with picks: teams can be swapped (and counts follow), not replaced", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0]); // picked the favorite

    expect(await updateGame(f.games.a1, input(f, { underdogId: f.teams[2] }))).toEqual({
      ok: false,
      problem: "teams-locked",
    });

    const swapped = await updateGame(f.games.a1, input(f, { favoriteId: f.teams[1], underdogId: f.teams[0] }));
    expect(swapped.ok).toBe(true);
    // The pick is still on team 1, which is now the underdog.
    expect(await getPickCounts(f.games.a1)).toEqual({ favorite: 0, underdog: 1 });
  });

  test("final games can't be edited", async () => {
    const f = await createFixtures();
    await testRequest().query(`update Game set Official = 1 where GameID = ${f.games.a2}`);
    expect(await updateGame(f.games.a2, input(f, { favoriteId: f.teams[2], underdogId: f.teams[3] }))).toEqual({
      ok: false,
      problem: "official",
    });
  });

  test("a game's inactive team can stay", async () => {
    const f = await createFixtures();
    const extra = await extraTeams();
    await testRequest().query(`update Game set UnderdogID = ${extra.inactive} where GameID = ${f.games.b1}`);
    expect((await updateGame(f.games.b1, input(f, { underdogId: extra.inactive }))).ok).toBe(true);
  });
});

describe("deleteGame", () => {
  test("deletes a game without picks", async () => {
    const f = await createFixtures();
    expect(await deleteGame(f.games.b2)).toEqual({ ok: true, weekId: f.weeks.open2 });
    expect(await gameRow(f.games.b2)).toBeUndefined();
  });

  test("won't delete a game with picks or a final game", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0]);
    await testRequest().query(`update Game set Official = 1 where GameID = ${f.games.a2}`);

    expect(await deleteGame(f.games.a1)).toEqual({ ok: false, problem: "has-picks" });
    expect(await deleteGame(f.games.a2)).toEqual({ ok: false, problem: "official" });
    expect(await gameRow(f.games.a1)).toBeDefined();
    expect(await gameRow(f.games.a2)).toBeDefined();
  });

  test("won't delete another season's game", async () => {
    const f = await createFixtures();
    const other = await testRequest().query(
      `select top 1 g.GameID gameId from Game g join Week w on w.WeekID = g.WeekID where w.SeasonID <> ${f.seasonId}`,
    );
    expect(await deleteGame(other.recordset[0].gameId)).toEqual({ ok: false, problem: "not-found" });
  });
});

describe("deleteGamePicks", () => {
  test("deletes the game's picks (and locks), resets counts, and leaves other games alone", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0], true);
    await insertPick(f.outsiderId, f.games.a1, f.teams[1]);
    await insertPick(f.playerId, f.games.a2, f.teams[2]);
    await testRequest().query(
      `update Game set favoritePickCount = 1, underdogPickCount = 1 where GameID = ${f.games.a1}`,
    );
    expect(await getGame(f.games.a1)).toMatchObject({ picks: 2, locks: 1 });

    expect(await deleteGamePicks(f.games.a1)).toEqual({ ok: true, weekId: f.weeks.open1, deleted: 2 });

    expect(await getGame(f.games.a1)).toMatchObject({ picks: 0, locks: 0 });
    expect(await getPickCounts(f.games.a1)).toEqual({ favorite: 0, underdog: 0 });
    expect((await getGame(f.games.a2))?.picks).toBe(1);
    // With no picks, the teams can be replaced and the game deleted.
    expect((await updateGame(f.games.a1, input(f, { underdogId: f.teams[2] }))).ok).toBe(true);
    expect((await deleteGame(f.games.a1)).ok).toBe(true);
  });

  test("won't touch a final game's picks", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0]);
    await testRequest().query(`update Game set Official = 1 where GameID = ${f.games.a1}`);
    expect(await deleteGamePicks(f.games.a1)).toEqual({ ok: false, problem: "official" });
    expect((await getGame(f.games.a1))?.picks).toBe(1);
  });
});
