/**
 * Tests the SetPicks draft in SetPicks.fix-locks-and-validation.sql. The
 * script is run inside each test's transaction, so this tests the file, not
 * whatever SetPicks is currently on the database, and leaves it unchanged.
 */
import { readFileSync } from "node:fs";
import sql from "mssql";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createFixtures,
  getPick,
  getPickCounts,
  insertPick,
  testRequest,
} from "../test/db";

beforeEach(async () => {
  await testRequest().batch(
    readFileSync(new URL("./SetPicks.fix-locks-and-validation.sql", import.meta.url), "utf8"),
  );
});

/** exec SetPicks; returns the saved count. */
async function setPicks(playerId: number, picks: [gameId: number, teamId: number, isLock: boolean][]) {
  const table = new sql.Table("MakePicks");
  table.schema = "dbo";
  table.columns.add("GameId", sql.Int);
  table.columns.add("Pick", sql.Int);
  table.columns.add("GOW", sql.Bit);
  for (const row of picks) table.rows.add(...row);

  const result = await testRequest()
    .input("PlayerId", sql.Int, playerId)
    // Far in the past: the procedure must ignore it and use the database clock.
    .input("Updated", sql.DateTime, new Date(Date.UTC(2000, 0, 1)))
    .input("Picks", sql.TVP, table)
    .execute<{ saved: number }>("SetPicks");
  return result.recordset[0].saved;
}

describe("SetPicks (draft)", () => {
  test("saves picks and a lock, and updates pick counts", async () => {
    const f = await createFixtures();

    const saved = await setPicks(f.playerId, [
      [f.games.a1, f.teams[0], true],
      [f.games.b2, f.teams[3], false],
    ]);

    expect(saved).toBe(2);
    expect(await getPick(f.playerId, f.games.a1)).toMatchObject({ teamId: f.teams[0], isLock: true });
    expect(await getPickCounts(f.games.b2)).toEqual({ favorite: 0, underdog: 1 });
  });

  test("works when the player's locks have started in both open weeks", async () => {
    // The current procedure fails here: "Subquery returned more than 1 value".
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.startedA, f.teams[0], true);
    await insertPick(f.playerId, f.games.startedB, f.teams[2], true);

    const saved = await setPicks(f.playerId, [
      [f.games.a1, f.teams[0], true],
      [f.games.b1, f.teams[1], false],
    ]);

    expect(saved).toBe(2);
    // Week 1's lock has started, so the new lock is saved as a plain pick.
    expect(await getPick(f.playerId, f.games.a1)).toMatchObject({ teamId: f.teams[0], isLock: false });
    expect((await getPick(f.playerId, f.games.startedA))?.isLock).toBe(true);
  });

  test("uses the database clock, not @Updated, to decide what has started", async () => {
    const f = await createFixtures();
    expect(await setPicks(f.playerId, [[f.games.startedA, f.teams[0], false]])).toBe(0);
  });

  test("skips closed weeks, teams not in the game and unknown games", async () => {
    const f = await createFixtures();

    const saved = await setPicks(f.playerId, [
      [f.games.inOfficialWeek, f.teams[0], false],
      [f.games.inNotLiveWeek, f.teams[0], false],
      [f.games.a2, f.teams[0], false],
      [2_000_000_000, f.teams[0], false],
    ]);

    expect(saved).toBe(0);
  });

  test("saves nothing for a player who isn't in the season", async () => {
    const f = await createFixtures();
    expect(await setPicks(f.outsiderId, [[f.games.a1, f.teams[0], false]])).toBe(0);
  });

  test("moving the lock clears the old one", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0], true);

    await setPicks(f.playerId, [[f.games.a2, f.teams[2], true]]);

    expect((await getPick(f.playerId, f.games.a1))?.isLock).toBe(false);
    expect((await getPick(f.playerId, f.games.a2))?.isLock).toBe(true);
  });

  test("rejects two locks in one week", async () => {
    const f = await createFixtures();
    await expect(
      setPicks(f.playerId, [
        [f.games.a1, f.teams[0], true],
        [f.games.a2, f.teams[2], true],
      ]),
    ).rejects.toThrow("Only one lock per week.");
  });
});
