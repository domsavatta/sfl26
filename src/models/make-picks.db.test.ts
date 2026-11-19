import { describe, expect, test } from "vitest";
import {
  createFixtures,
  getPick,
  getPickCounts,
  insertPick,
} from "../../test/db";
import { getMakePicks, savePicks } from "./make-picks";

describe("getMakePicks", () => {
  test("lists open weeks with only the games that haven't started", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[1]);

    const data = await getMakePicks(f.playerId);

    expect(data.season?.seasonId).toBe(f.seasonId);
    expect(data.inSeason).toBe(true);
    expect(data.weeks.map((w) => w.weekId)).toEqual([f.weeks.open1, f.weeks.open2]);
    const [week1, week2] = data.weeks;
    expect(week1.games.map((g) => g.gameId)).toEqual([f.games.a1, f.games.a2]);
    expect(week2.games.map((g) => g.gameId)).toEqual([f.games.b1, f.games.b2]);
    expect(week1.games[0]).toMatchObject({ pickTeamId: f.teams[1], isLock: false });
    expect(week1.games[1].pickTeamId).toBeNull();
    expect(week1.startedLock).toBeNull();
  });

  test("returns an unstarted lock", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a2, f.teams[2], true);

    const [week1] = (await getMakePicks(f.playerId)).weeks;

    expect(week1.startedLock).toBeNull();
    expect(week1.games.find((g) => g.gameId === f.games.a2)?.isLock).toBe(true);
  });

  test("shows a lock whose game has started, only in that week", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.startedA, f.teams[0], true);

    const [week1, week2] = (await getMakePicks(f.playerId)).weeks;

    expect(week1.startedLock).toEqual({
      teamName: "Test Team 1",
      opponentName: "Test Team 2",
    });
    expect(week1.games.every((g) => !g.isLock)).toBe(true);
    expect(week2.startedLock).toBeNull();
  });

  test("says when the player isn't in the season", async () => {
    const f = await createFixtures();
    expect((await getMakePicks(f.outsiderId)).inSeason).toBe(false);
  });
});

describe("savePicks", () => {
  test("saves new picks and a lock, and updates pick counts", async () => {
    const f = await createFixtures();

    const result = await savePicks(f.playerId, [
      { gameId: f.games.a1, teamId: f.teams[0], isLock: true },
      { gameId: f.games.a2, teamId: f.teams[3], isLock: false },
    ]);

    expect(result).toEqual({ saved: 2, rejected: 0 });
    expect(await getPick(f.playerId, f.games.a1)).toMatchObject({ teamId: f.teams[0], isLock: true });
    expect(await getPick(f.playerId, f.games.a2)).toMatchObject({ teamId: f.teams[3], isLock: false });
    expect(await getPickCounts(f.games.a1)).toEqual({ favorite: 1, underdog: 0 });
    expect(await getPickCounts(f.games.a2)).toEqual({ favorite: 0, underdog: 1 });
  });

  test("changes an existing pick", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0]);

    await savePicks(f.playerId, [{ gameId: f.games.a1, teamId: f.teams[1], isLock: false }]);

    const pick = await getPick(f.playerId, f.games.a1);
    expect(pick?.teamId).toBe(f.teams[1]);
    expect(pick?.updated.getUTCFullYear()).toBeGreaterThan(2000);
    expect(await getPickCounts(f.games.a1)).toEqual({ favorite: 0, underdog: 1 });
  });

  test("skips started games, closed weeks, teams not in the game and unknown games", async () => {
    const f = await createFixtures();

    const result = await savePicks(f.playerId, [
      { gameId: f.games.a1, teamId: f.teams[0], isLock: false }, // the only valid one
      { gameId: f.games.startedA, teamId: f.teams[0], isLock: false },
      { gameId: f.games.inOfficialWeek, teamId: f.teams[0], isLock: false },
      { gameId: f.games.inNotLiveWeek, teamId: f.teams[0], isLock: false },
      { gameId: f.games.a2, teamId: f.teams[0], isLock: false }, // a2 is team 3 vs 4
      { gameId: 2_000_000_000, teamId: f.teams[0], isLock: false },
    ]);

    expect(result).toEqual({ saved: 1, rejected: 5 });
    for (const gameId of [f.games.startedA, f.games.inOfficialWeek, f.games.inNotLiveWeek, f.games.a2]) {
      expect(await getPick(f.playerId, gameId)).toBeNull();
    }
  });

  test("saves nothing for a player who isn't in the season", async () => {
    const f = await createFixtures();

    const result = await savePicks(f.outsiderId, [
      { gameId: f.games.a1, teamId: f.teams[0], isLock: false },
    ]);

    expect(result).toEqual({ saved: 0, rejected: 1 });
    expect(await getPick(f.outsiderId, f.games.a1)).toBeNull();
  });

  test("doesn't change a pick on a game that has started", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.startedA, f.teams[0]);

    await savePicks(f.playerId, [{ gameId: f.games.startedA, teamId: f.teams[1], isLock: false }]);

    expect((await getPick(f.playerId, f.games.startedA))?.teamId).toBe(f.teams[0]);
  });

  test("moving the lock clears the old one, even if the old game isn't sent", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0], true);

    await savePicks(f.playerId, [{ gameId: f.games.a2, teamId: f.teams[2], isLock: true }]);

    expect((await getPick(f.playerId, f.games.a1))?.isLock).toBe(false);
    expect((await getPick(f.playerId, f.games.a2))?.isLock).toBe(true);
  });

  test("sending the lock game without the lock clears it", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.a1, f.teams[0], true);

    await savePicks(f.playerId, [{ gameId: f.games.a1, teamId: f.teams[0], isLock: false }]);

    expect((await getPick(f.playerId, f.games.a1))?.isLock).toBe(false);
  });

  test("a week whose lock has started keeps it; the new pick saves without the lock", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.startedA, f.teams[0], true);

    const result = await savePicks(f.playerId, [
      { gameId: f.games.a1, teamId: f.teams[0], isLock: true },
      { gameId: f.games.b1, teamId: f.teams[0], isLock: true }, // other week: fine
    ]);

    expect(result.saved).toBe(2);
    expect(await getPick(f.playerId, f.games.a1)).toMatchObject({ teamId: f.teams[0], isLock: false });
    expect((await getPick(f.playerId, f.games.startedA))?.isLock).toBe(true);
    expect((await getPick(f.playerId, f.games.b1))?.isLock).toBe(true);
  });

  test("works when the player's locks have started in both open weeks", async () => {
    const f = await createFixtures();
    await insertPick(f.playerId, f.games.startedA, f.teams[0], true);
    await insertPick(f.playerId, f.games.startedB, f.teams[2], true);

    const result = await savePicks(f.playerId, [
      { gameId: f.games.a1, teamId: f.teams[0], isLock: false },
      { gameId: f.games.b1, teamId: f.teams[1], isLock: false },
    ]);

    expect(result).toEqual({ saved: 2, rejected: 0 });
  });

  test("rejects two locks in one week", async () => {
    const f = await createFixtures();

    await expect(
      savePicks(f.playerId, [
        { gameId: f.games.a1, teamId: f.teams[0], isLock: true },
        { gameId: f.games.a2, teamId: f.teams[2], isLock: true },
      ]),
    ).rejects.toThrow("Only one lock per week.");
  });
});
