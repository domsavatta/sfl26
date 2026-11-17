/**
 * Data for the home page: the current season's current weeks and their games.
 *
 * "Current" weeks are live weeks of the current season that aren't official
 * yet (Week.Live = 1, Week.Official = 0), as in the previous app; there can be
 * more than one (e.g. a week still being graded and the next week).
 */
import { query } from "db";
import {
  GAME_COLUMNS,
  GAME_FROM,
  NOW_EASTERN,
  toGame,
  type GameDbRow,
  type PicksGame,
} from "./picks";

export type HomeGame = PicksGame & {
  /** How many players picked each side (counts only; picks stay hidden). */
  favoritePicks: number;
  underdogPicks: number;
};

export type HomeWeek = {
  weekId: number;
  weekName: string;
  games: HomeGame[];
};

export type HomeData = {
  season: { seasonId: number; seasonName: string } | null;
  weeks: HomeWeek[]; // oldest first
};

export async function getHomeData(): Promise<HomeData> {
  const result = await query<unknown>(`
    declare @now datetime = ${NOW_EASTERN};

    declare @seasonId int = (
      select top 1 s.SeasonID from Season s
      where s.IsCurrent = 1 and s.Active = 1
      order by s.Sort desc);

    select s.SeasonID seasonId, s.Name seasonName
    from Season s where s.SeasonID = @seasonId;

    select w.WeekID weekId, w.Name weekName
    from Week w
    where w.SeasonID = @seasonId and w.Live = 1 and w.Official = 0
    order by w.Sort;

    select g.WeekID weekId, ${GAME_COLUMNS},
      (select count(*) from Pick p where p.GameID = g.GameID and p.Pick = g.FavoriteID) favoritePicks,
      (select count(*) from Pick p where p.GameID = g.GameID and p.Pick = g.UnderdogID) underdogPicks
    ${GAME_FROM}
    join Week w on w.WeekID = g.WeekID
    where w.SeasonID = @seasonId and w.Live = 1 and w.Official = 0
    order by g.Gametime, g.GameID;
  `);
  const [seasonRows, weekRows, gameRows] = result.recordsets as unknown as [
    { seasonId: number; seasonName: string }[],
    { weekId: number; weekName: string }[],
    (GameDbRow & {
      weekId: number;
      favoritePicks: number;
      underdogPicks: number;
    })[],
  ];

  return {
    season: seasonRows[0] ?? null,
    weeks: weekRows.map((w) => ({
      ...w,
      games: gameRows
        .filter((g) => g.weekId === w.weekId)
        .map((g) => ({
          ...toGame(g),
          favoritePicks: g.favoritePicks,
          underdogPicks: g.underdogPicks,
        })),
    })),
  };
}
