import sql from "mssql";
import { describe, expect, test } from "vitest";
import { createFixtures, insertPick, testRequest } from "../../test/db";
import { setScore, type ScoreInput } from "./admin-games";

async function gameRow(gameId: number) {
  const result = await testRequest()
    .input("gameId", sql.Int, gameId)
    .query(`select FavoriteScore, UnderdogScore, Status, WinnerID, Tie, Official,
      QualityPoints, DifficultyPoints from Game where GameID = @gameId`);
  return result.recordset[0];
}

const final = (favoriteScore: number, underdogScore: number, result: ScoreInput["result"]): ScoreInput => ({
  favoriteScore,
  underdogScore,
  status: "Final",
  result,
  official: true,
});

describe("setScore", () => {
  test("a final score: result, points, and standings for the week and later weeks", async () => {
    const f = await createFixtures();
    // startedA: team 1 (favorite, -3.5) vs team 2, in week open1 (Sort 1).
    await insertPick(f.playerId, f.games.startedA, f.teams[0]); // will be right
    await insertPick(f.outsiderId, f.games.startedA, f.teams[1]); // will be wrong

    const result = await setScore(f.games.startedA, final(31, 27, "favorite"));

    // open1 plus the three later weeks of the fixture season.
    expect(result).toEqual({ ok: true, weekId: f.weeks.open1, weeksRebuilt: 4 });
    const row = await gameRow(f.games.startedA);
    expect(row).toMatchObject({
      FavoriteScore: 31,
      UnderdogScore: 27,
      Status: "Final",
      WinnerID: f.teams[0],
      Tie: false,
      Official: true,
      DifficultyPoints: 1, // one of two pickers missed it
    });
    expect(row.QualityPoints).toBeCloseTo(0.5); // won by 4, spread 3.5

    const standing = await testRequest().query(
      `select CorrectPicks, TotalGames from WeekStanding
       where WeekID = ${f.weeks.open1} and PlayerId = ${f.playerId} and League = 'O'`,
    );
    expect(standing.recordset[0]).toEqual({ CorrectPicks: 1, TotalGames: 1 });
  });

  test("a push stores Tie with no winner", async () => {
    const f = await createFixtures();
    // startedB: team 3 (favorite, -1) vs team 4.
    await setScore(f.games.startedB, final(21, 20, "push"));
    expect(await gameRow(f.games.startedB)).toMatchObject({ WinnerID: null, Tie: true, Official: true });
  });

  test("the result can be overridden", async () => {
    const f = await createFixtures();
    await setScore(f.games.startedA, final(31, 27, "underdog"));
    expect((await gameRow(f.games.startedA)).WinnerID).toBe(f.teams[1]);
  });

  test("an in-progress score, then clearing it", async () => {
    const f = await createFixtures();
    await setScore(f.games.startedA, {
      favoriteScore: 14,
      underdogScore: 3,
      status: "2nd Qtr",
      result: "favorite",
      official: false,
    });
    expect(await gameRow(f.games.startedA)).toMatchObject({
      FavoriteScore: 14,
      Status: "2nd Qtr",
      Official: false,
    });

    await setScore(f.games.startedA, {
      favoriteScore: null,
      underdogScore: null,
      status: null,
      result: null,
      official: false,
    });
    expect(await gameRow(f.games.startedA)).toMatchObject({
      FavoriteScore: null,
      UnderdogScore: null,
      Status: null,
      WinnerID: null,
      Tie: false,
      Official: false,
    });
  });

  test("not before kickoff, and not another season's game", async () => {
    const f = await createFixtures();
    expect(await setScore(f.games.a1, final(10, 7, "favorite"))).toEqual({
      ok: false,
      problem: "not-started",
    });
    expect((await gameRow(f.games.a1)).FavoriteScore).toBeNull();

    const other = await testRequest().query(
      `select top 1 g.GameID gameId from Game g join Week w on w.WeekID = g.WeekID where w.SeasonID <> ${f.seasonId}`,
    );
    const otherId = other.recordset[0].gameId;
    const before = await gameRow(otherId);
    expect(await setScore(otherId, final(1, 0, "favorite"))).toEqual({ ok: false, problem: "not-found" });
    expect(await gameRow(otherId)).toEqual(before);
  });
});
