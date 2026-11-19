import { describe, expect, test } from "vitest";
import { createFixtures, testRequest } from "../../test/db";
import { createSeason, getSeasons, makeSeasonCurrent } from "./admin-seasons";

async function seasonRow(seasonId: number) {
  const result = await testRequest().query(
    `select Name, Sort, Active, IsCurrent, TotalPlayers, defaultPassword from Season where SeasonID = ${seasonId}`,
  );
  return result.recordset[0];
}

const roleExists = async (name: string) =>
  (await testRequest().query(`select count(*) n from webpages_Roles where RoleName = '${name}'`)).recordset[0].n === 1;

describe("getSeasons", () => {
  test("newest first, with week and player counts and the current season", async () => {
    const f = await createFixtures();
    const [first] = await getSeasons();
    expect(first).toMatchObject({ seasonId: f.seasonId, name: "Test Season", current: true, weeks: 4, players: 1 });
    expect((await getSeasons()).filter((s) => s.current)).toHaveLength(1);
  });
});

describe("createSeason", () => {
  test("adds a season after the others, with its role and no players, not current", async () => {
    const f = await createFixtures();

    const result = await createSeason({ name: "2099 Season", defaultPassword: "pw2099", makeCurrent: false });

    expect(result.ok).toBe(true);
    const seasonId = result.ok ? result.seasonId : 0;
    const fixtureSort = (await seasonRow(f.seasonId)).Sort;
    expect(await seasonRow(seasonId)).toEqual({
      Name: "2099 Season",
      Sort: fixtureSort + 1,
      Active: true,
      IsCurrent: false,
      TotalPlayers: 0,
      defaultPassword: "pw2099",
    });
    expect(await roleExists("player2099")).toBe(true);
    expect((await getSeasons()).find((s) => s.seasonId === seasonId)).toMatchObject({ players: 0, weeks: 0 });
    expect((await seasonRow(f.seasonId)).IsCurrent).toBe(true);
  });

  test("can make the new season current", async () => {
    const f = await createFixtures();
    const result = await createSeason({ name: "2099 Season", defaultPassword: "pw2099", makeCurrent: true });
    const seasonId = result.ok ? result.seasonId : 0;
    expect((await seasonRow(seasonId)).IsCurrent).toBe(true);
    expect((await seasonRow(f.seasonId)).IsCurrent).toBe(false);
  });

  test("no role for a name without a year; names are unique", async () => {
    await createFixtures();
    const before = (await testRequest().query(`select count(*) n from webpages_Roles`)).recordset[0].n;
    expect((await createSeason({ name: "Bonus Season", defaultPassword: "x", makeCurrent: false })).ok).toBe(true);
    expect((await testRequest().query(`select count(*) n from webpages_Roles`)).recordset[0].n).toBe(before);
    expect(await createSeason({ name: "Test Season", defaultPassword: "x", makeCurrent: false })).toEqual({
      ok: false,
      problem: "duplicate-name",
    });
  });
});

describe("makeSeasonCurrent", () => {
  test("makes one season current (and active), and no other", async () => {
    const f = await createFixtures();
    const old = await testRequest().query(`select top 1 SeasonID id from Season where Active = 0 and SeasonID <> ${f.seasonId}`);
    const hiddenId = old.recordset[0]?.id;
    const target = hiddenId ?? (await getSeasons())[1].seasonId;

    expect(await makeSeasonCurrent(target)).toEqual({ ok: true, seasonId: target });

    expect(await seasonRow(target)).toMatchObject({ IsCurrent: true, Active: true });
    expect((await seasonRow(f.seasonId)).IsCurrent).toBe(false);
    const current = await testRequest().query(`select count(*) n from Season where IsCurrent = 1`);
    expect(current.recordset[0].n).toBe(1);
  });

  test("not-found for a missing season", async () => {
    expect(await makeSeasonCurrent(2_000_000_000)).toEqual({ ok: false, problem: "not-found" });
  });
});
