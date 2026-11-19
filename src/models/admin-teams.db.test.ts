import sql from "mssql";
import { describe, expect, test } from "vitest";
import { createFixtures, testRequest } from "../../test/db";
import { createTeam, deleteTeam, getAllTeams, getTeam, updateTeam } from "./admin-teams";

async function teamRow(teamId: number) {
  const result = await testRequest()
    .input("teamId", sql.Int, teamId)
    .query(`select Name, League, Abv, Active, ImageName from Team where TeamID = @teamId`);
  return result.recordset[0];
}

const add = async (name: string, league: "NFL" | "College" = "College") => {
  const result = await createTeam({ name, league, abbreviation: null, active: true });
  if (!result.ok) throw new Error(result.problem);
  return result.teamId;
};

describe("getAllTeams / getTeam", () => {
  test("lists teams with their game counts", async () => {
    const f = await createFixtures();
    const teams = await getAllTeams();
    // Fixture team 1 is in startedA, a1, b1 and the two closed-week games.
    expect(teams.find((t) => t.teamId === f.teams[0])).toMatchObject({
      name: "Test Team 1",
      league: "NFL",
      active: true,
      games: 5,
    });
    expect(teams.findIndex((t) => t.league === "College")).toBeGreaterThan(
      teams.findLastIndex((t) => t.league === "NFL"),
    );
    expect(await getTeam(2_000_000_000)).toBeNull();
  });
});

describe("createTeam", () => {
  test("adds a team", async () => {
    const result = await createTeam({ name: "Test Add U", league: "College", abbreviation: "TAU", active: false });
    expect(result.ok).toBe(true);
    expect(await teamRow(result.ok ? result.teamId : 0)).toMatchObject({
      Name: "Test Add U",
      League: "College",
      Abv: "TAU",
      Active: false,
    });
  });

  test("names are unique within a league, not across leagues", async () => {
    await add("Test Same Name", "College");
    expect(await createTeam({ name: "Test Same Name", league: "College", abbreviation: null, active: true })).toEqual({
      ok: false,
      problem: "duplicate",
    });
    expect((await createTeam({ name: "Test Same Name", league: "NFL", abbreviation: null, active: true })).ok).toBe(
      true,
    );
  });
});

describe("updateTeam", () => {
  test("changes name, abbreviation and active; leaves logo fields alone", async () => {
    const teamId = await add("Test Edit U");
    await testRequest().query(`update Team set ImageName = 'logo.png' where TeamID = ${teamId}`);

    expect(
      await updateTeam(teamId, { name: "Test Edited U", league: "NFL", abbreviation: "TEU", active: false }),
    ).toEqual({ ok: true, teamId });
    expect(await teamRow(teamId)).toEqual({
      Name: "Test Edited U",
      League: "NFL", // no games, so the league can change
      Abv: "TEU",
      Active: false,
      ImageName: "logo.png",
    });
  });

  test("a team with games keeps its league", async () => {
    const f = await createFixtures();
    expect(
      await updateTeam(f.teams[0], { name: "Test Team 1", league: "College", abbreviation: null, active: true }),
    ).toEqual({ ok: false, problem: "league-locked" });
    // Other changes are fine.
    expect(
      (await updateTeam(f.teams[0], { name: "Test Team One", league: "NFL", abbreviation: "T1", active: false })).ok,
    ).toBe(true);
  });

  test("can't take another team's name in the same league", async () => {
    await add("Test Taken");
    const teamId = await add("Test Other");
    expect(
      await updateTeam(teamId, { name: "Test Taken", league: "College", abbreviation: null, active: true }),
    ).toEqual({ ok: false, problem: "duplicate" });
  });
});

describe("deleteTeam", () => {
  test("deletes a team with no games", async () => {
    const teamId = await add("Test Delete U");
    expect(await deleteTeam(teamId)).toEqual({ ok: true, teamId });
    expect(await teamRow(teamId)).toBeUndefined();
  });

  test("won't delete a team with games", async () => {
    const f = await createFixtures();
    expect(await deleteTeam(f.teams[0])).toEqual({ ok: false, problem: "has-games" });
    expect(await teamRow(f.teams[0])).toBeDefined();
  });

  test("not-found for a missing team", async () => {
    expect(await deleteTeam(2_000_000_000)).toEqual({ ok: false, problem: "not-found" });
  });
});
