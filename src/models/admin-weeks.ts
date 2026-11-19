/**
 * Admin: the current season's weeks.
 *
 * The current season is the newest (by Sort) with IsCurrent = 1. Weeks are
 * only ever added to, or changed in, that season. A week's name and order
 * (Week.Sort) must be unique within the season.
 *
 * Live: the week shows on the site (picks, standings, home page).
 * Official: the week's results are final; it's closed for picks.
 */
import { query } from 'db';
import {
  GAME_COLUMNS,
  GAME_FROM,
  NOW_EASTERN,
  toGame,
  type GameDbRow,
  type PicksGame,
} from './picks';

export type AdminWeek = {
  weekId: number;
  weekName: string;
  sort: number;
  live: boolean;
  official: boolean;
  games: number;
};

export type AdminSeasonWeeks = {
  season: { seasonId: number; seasonName: string } | null;
  weeks: AdminWeek[];
};

export type WeekInput = {
  weekName: string;
  sort: number;
  live: boolean;
  official: boolean;
};

export type SaveWeekResult =
  | { ok: true; weekId: number }
  | {
      ok: false;
      problem: 'no-season' | 'not-found' | 'duplicate-name' | 'duplicate-sort';
    };

const CURRENT_SEASON = `declare @seasonId int = (
  select top 1 SeasonID from Season where IsCurrent = 1 order by Sort desc);`;

const WEEK_COLUMNS = `w.WeekID weekId, w.Name weekName, isnull(w.Sort, 0) sort,
  w.Live live, w.Official official,
  (select count(*) from Game g where g.WeekID = w.WeekID) games`;

/** Whether the player has the admin role (checked live, not from the session). */
export async function isAdmin(playerId: number): Promise<boolean> {
  const result = await query<{ admin: boolean }>(
    `select cast(iif(exists (
       select 1 from webpages_UsersInRoles r
       join Player p on p.PlayerId = r.UserId
       where r.UserId = @playerId and r.RoleId = 1 and p.PNG = 0), 1, 0) as bit) admin`,
    { playerId },
  );
  return result.recordset[0]?.admin ?? false;
}

export async function getSeasonWeeks(): Promise<AdminSeasonWeeks> {
  const result = await query<unknown>(
    `${CURRENT_SEASON}
     select SeasonID seasonId, Name seasonName from Season where SeasonID = @seasonId;
     select ${WEEK_COLUMNS} from Week w
     where w.SeasonID = @seasonId
     order by w.Sort, w.WeekID;`,
  );
  const [seasonRows, weeks] = result.recordsets as unknown as [
    { seasonId: number; seasonName: string }[],
    AdminWeek[],
  ];
  return { season: seasonRows[0] ?? null, weeks: seasonRows[0] ? weeks : [] };
}

/** A week in the current season, or null. */
export async function getWeek(weekId: number): Promise<AdminWeek | null> {
  const result = await query<AdminWeek>(
    `${CURRENT_SEASON}
     select ${WEEK_COLUMNS} from Week w
     where w.WeekID = @weekId and w.SeasonID = @seasonId;`,
    { weekId },
  );
  return result.recordset[0] ?? null;
}

/** Problems shared by create and update; needs @seasonId, @weekId (null on create). */
const PROBLEM = `case
  when @seasonId is null then 'no-season'
  when exists (select 1 from Week where SeasonID = @seasonId and Name = @weekName
    and (@weekId is null or WeekID <> @weekId)) then 'duplicate-name'
  when exists (select 1 from Week where SeasonID = @seasonId and Sort = @sort
    and (@weekId is null or WeekID <> @weekId)) then 'duplicate-sort'
end`;

const toResult = (row: { problem: string | null; weekId: number | null }) =>
  row.problem || !row.weekId
    ? ({ ok: false, problem: row.problem ?? 'not-found' } as SaveWeekResult)
    : ({ ok: true, weekId: row.weekId } as SaveWeekResult);

/** Adds a week to the current season. */
export async function createWeek(week: WeekInput): Promise<SaveWeekResult> {
  const result = await query<{ problem: string | null; weekId: number | null }>(
    `${CURRENT_SEASON}
     declare @weekId int = null;
     declare @problem varchar(20) = ${PROBLEM};
     if @problem is null
     begin
       insert into Week (Name, Sort, SeasonID, Live, Official, HomeDisplay)
       values (@weekName, @sort, @seasonId, @live, @official, 0);
       set @weekId = scope_identity();
     end
     select @problem problem, @weekId weekId;`,
    { ...week },
  );
  return toResult(result.recordset[0]);
}

/** Updates a week in the current season. */
export async function updateWeek(
  weekId: number,
  week: WeekInput,
): Promise<SaveWeekResult> {
  const result = await query<{ problem: string | null; weekId: number | null }>(
    `${CURRENT_SEASON}
     declare @problem varchar(20) =
       iif(exists (select 1 from Week where WeekID = @weekId and SeasonID = @seasonId),
         ${PROBLEM}, 'not-found');
     if @problem is null
       update Week set Name = @weekName, Sort = @sort, Live = @live, Official = @official
       where WeekID = @weekId;
     select @problem problem, iif(@problem is null, @weekId, null) weekId;`,
    { ...week, weekId },
  );
  return toResult(result.recordset[0]);
}

export type DeleteWeekResult = 'ok' | 'not-found' | 'has-games';

/**
 * Deletes a week in the current season that has no games, with any
 * WeekStanding rows for it (an empty week can have 0-0 standings rows).
 */
export async function deleteWeek(weekId: number): Promise<DeleteWeekResult> {
  const result = await query<{ outcome: DeleteWeekResult }>(
    `set xact_abort on;
     ${CURRENT_SEASON}
     begin transaction;
     declare @outcome varchar(20) = case
       when not exists (select 1 from Week with (updlock, holdlock)
         where WeekID = @weekId and SeasonID = @seasonId) then 'not-found'
       when exists (select 1 from Game with (updlock, holdlock)
         where WeekID = @weekId) then 'has-games'
       else 'ok'
     end;
     if @outcome = 'ok'
     begin
       delete from WeekStanding where WeekID = @weekId;
       delete from Week where WeekID = @weekId;
     end
     commit;
     select @outcome outcome;`,
    { weekId },
  );
  return result.recordset[0].outcome;
}

export type AdminGame = PicksGame & {
  favoritePicks: number; // players who picked each side
  underdogPicks: number;
};

/** A current-season week's games, by gametime, with pick counts. */
export async function getWeekGames(weekId: number): Promise<AdminGame[]> {
  const result = await query<
    GameDbRow & { favoritePicks: number; underdogPicks: number }
  >(
    `declare @now datetime = ${NOW_EASTERN};
     ${CURRENT_SEASON}
     select ${GAME_COLUMNS},
       (select count(*) from Pick p where p.GameID = g.GameID and p.Pick = g.FavoriteID) favoritePicks,
       (select count(*) from Pick p where p.GameID = g.GameID and p.Pick = g.UnderdogID) underdogPicks
     ${GAME_FROM}
     join Week w on w.WeekID = g.WeekID
     where g.WeekID = @weekId and w.SeasonID = @seasonId
     order by g.Gametime, g.GameID;`,
    { weekId },
  );
  type Row = GameDbRow & { favoritePicks: number; underdogPicks: number };
  return result.recordset.map((row: Row) => ({
    ...toGame(row),
    favoritePicks: row.favoritePicks,
    underdogPicks: row.underdogPicks,
  }));
}
