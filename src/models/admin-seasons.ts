/**
 * Admin: seasons.
 *
 * The current season (IsCurrent = 1; the newest by Sort if more than one)
 * is the one Make Picks, the home page and the admin weeks list use. Making
 * a season current also makes it Active (shown on the site) and clears
 * IsCurrent on the others.
 *
 * A new season:
 * - goes after the others (Sort = highest + 1);
 * - needs a default password (Season.defaultPassword, up to 10 characters),
 *   used for new players and password resets;
 * - starts with no players: add them on the admin Players page.
 * Season.TotalPlayers isn't used; it's required, so new seasons get 0.
 */
import { query } from 'db';

export type AdminSeason = {
  seasonId: number;
  name: string;
  sort: number;
  active: boolean;
  current: boolean;
  weeks: number;
  players: number;
};

export type SeasonInput = {
  name: string;
  defaultPassword: string;
  makeCurrent: boolean;
};

export type SeasonProblem = 'not-found' | 'duplicate-name';

export type SaveSeasonResult =
  | { ok: true; seasonId: number }
  | { ok: false; problem: SeasonProblem };

/** Every season, newest first. */
export async function getSeasons(): Promise<AdminSeason[]> {
  const result = await query<AdminSeason>(
    `declare @current int = (select top 1 SeasonID from Season where IsCurrent = 1 order by Sort desc);
     select s.SeasonID seasonId, s.Name name, isnull(s.Sort, 0) sort, s.Active active,
       cast(iif(s.SeasonID = @current, 1, 0) as bit) [current],
       (select count(*) from Week w where w.SeasonID = s.SeasonID) weeks,
       (select count(*) from PlayersSeason ps where ps.SeasonID = s.SeasonID) players
     from Season s
     order by s.Sort desc, s.SeasonID desc`,
  );
  return result.recordset;
}

/** Sets @seasonId as the only current season, and makes it Active. */
const MAKE_CURRENT = `
  update Season set
    IsCurrent = iif(SeasonID = @seasonId, 1, 0),
    Active = iif(SeasonID = @seasonId, 1, Active)
  where IsCurrent = 1 or SeasonID = @seasonId;`;

type Row = { problem: SeasonProblem | null; seasonId: number | null };
const toResult = (row: Row): SaveSeasonResult =>
  row.problem || !row.seasonId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, seasonId: row.seasonId };

export async function createSeason(season: SeasonInput): Promise<SaveSeasonResult> {
  const result = await query<Row>(
    `set xact_abort on;
     begin transaction;
     declare @seasonId int = null;
     declare @problem varchar(20) =
       iif(exists (select 1 from Season with (updlock, holdlock) where Name = @name), 'duplicate-name', null);
     if @problem is null
     begin
       insert into Season (Name, Sort, Active, TotalPlayers, IsCurrent, defaultPassword)
       values (@name, (select isnull(max(Sort), 0) + 1 from Season), 1, 0, 0, @defaultPassword);
       set @seasonId = scope_identity();

       if @makeCurrent = 1
       begin
        ${MAKE_CURRENT}
       end
     end
     commit;
     select @problem problem, @seasonId seasonId;`,
    {
      name: season.name,
      defaultPassword: season.defaultPassword,
      makeCurrent: season.makeCurrent,
    },
  );
  return toResult(result.recordset[0]);
}

/** Makes a season the current one. */
export async function makeSeasonCurrent(seasonId: number): Promise<SaveSeasonResult> {
  const result = await query<Row>(
    `set xact_abort on;
     begin transaction;
     declare @problem varchar(20) =
       iif(exists (select 1 from Season with (updlock, holdlock) where SeasonID = @seasonId), null, 'not-found');
     if @problem is null
     begin
      ${MAKE_CURRENT}
     end
     commit;
     select @problem problem, iif(@problem is null, @seasonId, null) seasonId;`,
    { seasonId },
  );
  return toResult(result.recordset[0]);
}
