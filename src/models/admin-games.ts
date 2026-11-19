/**
 * Admin: adding, editing and deleting games in the current season's weeks.
 *
 * Rules (enforced here, in SQL):
 * - only games in the current season's weeks;
 * - both teams exist and are in the same league; new teams must be active
 *   (a game's existing teams can stay even if since made inactive);
 * - final (official) games can't be edited or deleted (their results depend
 *   on the spread and score);
 * - once a game has picks, its teams can't be replaced (picks are stored as a
 *   team), but favorite and underdog can be swapped;
 * - games with picks can't be deleted (that would delete players' picks).
 *
 * Gametime is US Eastern wall-clock time, passed as "YYYY-MM-DDTHH:mm" text
 * and converted in SQL, so no time zone conversion happens on the way.
 * Scores, results and Official are set with setScore, which also rebuilds
 * the standings.
 */
import { query } from 'db';
import type { GameResult } from '@/lib/score-form';
import { NOW_EASTERN } from './picks';

export type AdminTeam = { teamId: number; name: string; league: string };

export type GameInput = {
  favoriteId: number;
  underdogId: number;
  favoriteSite: 1 | 2 | 3; // 1 favorite at home, 2 underdog at home, 3 neutral
  spread: number; // 0 is a pick'em
  gametime: string; // "YYYY-MM-DDTHH:mm", Eastern
  storyline: string | null;
};

export type AdminGameDetail = Omit<GameInput, 'gametime'> & {
  gameId: number;
  weekId: number;
  weekName: string;
  gametime: Date; // Eastern time in the UTC fields
  favoriteName: string;
  underdogName: string;
  official: boolean;
  picks: number;
  locks: number; // picks that are a player's lock (GOW)
  favoriteScore: number | null;
  underdogScore: number | null;
  status: string | null;
  winnerId: number | null; // the team that covered
  tie: boolean; // push against the spread
  started: boolean;
};

export type GameProblem =
  | 'not-found'
  | 'unknown-team'
  | 'different-leagues'
  | 'official'
  | 'teams-locked'
  | 'has-picks'
  | 'not-started';

export type SaveGameResult =
  | { ok: true; gameId: number; weekId: number }
  | { ok: false; problem: GameProblem };

const CURRENT_SEASON = `declare @seasonId int = (
  select top 1 SeasonID from Season where IsCurrent = 1 order by Sort desc);`;

/** Active teams, plus any of `alsoIds` (a game's current teams), by league and name. */
export async function getTeams(alsoIds: number[] = []): Promise<AdminTeam[]> {
  const [a = 0, b = 0] = alsoIds;
  const result = await query<AdminTeam>(
    `select TeamID teamId, Name name, League league from Team
     where Active = 1 or TeamID in (@a, @b)
     order by League desc, Name`,
    { a, b },
  );
  return result.recordset;
}

/** A game in a current-season week, or null. */
export async function getGame(gameId: number): Promise<AdminGameDetail | null> {
  const result = await query<AdminGameDetail>(
    `declare @now datetime = ${NOW_EASTERN};
     ${CURRENT_SEASON}
     select g.GameID gameId, g.WeekID weekId, w.Name weekName,
       g.FavoriteID favoriteId, f.Name favoriteName,
       g.UnderdogID underdogId, u.Name underdogName,
       g.FavoriteSite favoriteSite, isnull(g.Spread, 0) spread, g.Gametime gametime,
       g.Storyline storyline, g.Official official,
       g.FavoriteScore favoriteScore, g.UnderdogScore underdogScore, g.Status status,
       g.WinnerID winnerId, g.Tie tie,
       cast(iif(g.Gametime <= @now, 1, 0) as bit) started,
       (select count(*) from Pick p where p.GameID = g.GameID) picks,
       (select count(*) from Pick p where p.GameID = g.GameID and p.GOW = 1) locks
     from Game g
     join Week w on w.WeekID = g.WeekID
     join Team f on f.TeamID = g.FavoriteID
     join Team u on u.TeamID = g.UnderdogID
     where g.GameID = @gameId and w.SeasonID = @seasonId`,
    { gameId },
  );
  return result.recordset[0] ?? null;
}

/** Team checks shared by create and update; needs @favoriteId, @underdogId, @gameId. */
const TEAM_PROBLEM = `case
  when (select count(*) from Team t where t.TeamID in (@favoriteId, @underdogId)
    and (t.Active = 1 or t.TeamID in (
      select x.TeamID from Game g
      cross apply (values (g.FavoriteID), (g.UnderdogID)) x(TeamID)
      where g.GameID = @gameId))) <> 2 then 'unknown-team'
  when (select count(distinct League) from Team
    where TeamID in (@favoriteId, @underdogId)) <> 1 then 'different-leagues'
end`;

const gameParams = (game: GameInput) => ({
  favoriteId: game.favoriteId,
  underdogId: game.underdogId,
  favoriteSite: game.favoriteSite,
  spread: game.spread,
  gametime: game.gametime,
  storyline: game.storyline,
});

type ResultRow = { problem: GameProblem | null; gameId: number | null; weekId: number | null };

const toResult = (row: ResultRow): SaveGameResult =>
  row.problem || !row.gameId || !row.weekId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, gameId: row.gameId, weekId: row.weekId };

/** Adds a game to a week in the current season. */
export async function createGame(
  weekId: number,
  game: GameInput,
): Promise<SaveGameResult> {
  const result = await query<ResultRow>(
    `${CURRENT_SEASON}
     declare @gameId int = null;
     declare @problem varchar(20) = iif(
       exists (select 1 from Week where WeekID = @weekId and SeasonID = @seasonId),
       ${TEAM_PROBLEM}, 'not-found');
     if @problem is null
     begin
       insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread,
         WeekID, Storyline, Official, Tie, QualityPoints, DifficultyPoints)
       values (@favoriteId, @underdogId, convert(datetime, @gametime + ':00', 126),
         @favoriteSite, @spread, @weekId, @storyline, 0, 0, 0, 0);
       set @gameId = scope_identity();
     end
     select @problem problem, @gameId gameId, @weekId weekId;`,
    { ...gameParams(game), weekId },
  );
  return toResult(result.recordset[0]);
}

/** Updates a game's teams, site, spread, kickoff and storyline. */
export async function updateGame(
  gameId: number,
  game: GameInput,
): Promise<SaveGameResult> {
  const result = await query<ResultRow>(
    `set xact_abort on;
     ${CURRENT_SEASON}
     begin transaction;
     declare @weekId int, @official bit, @oldFavorite int, @oldUnderdog int;
     select @weekId = g.WeekID, @official = g.Official,
       @oldFavorite = g.FavoriteID, @oldUnderdog = g.UnderdogID
     from Game g with (updlock, holdlock)
     join Week w on w.WeekID = g.WeekID
     where g.GameID = @gameId and w.SeasonID = @seasonId;

     declare @problem varchar(20) = case
       when @weekId is null then 'not-found'
       when @official = 1 then 'official'
       -- Picks are stored as a team: with picks, only a swap keeps them valid.
       when exists (select 1 from Pick with (updlock, holdlock) where GameID = @gameId)
         and not ((@favoriteId = @oldFavorite and @underdogId = @oldUnderdog)
               or (@favoriteId = @oldUnderdog and @underdogId = @oldFavorite))
         then 'teams-locked'
       else ${TEAM_PROBLEM}
     end;
     if @problem is null
     begin
       update Game set FavoriteID = @favoriteId, UnderdogID = @underdogId,
         Gametime = convert(datetime, @gametime + ':00', 126),
         FavoriteSite = @favoriteSite, Spread = @spread, Storyline = @storyline
       where GameID = @gameId;
       -- A swap changes which side each pick is on.
       if @favoriteId <> @oldFavorite
       begin
         declare @counted dbo.MakePicks;
         insert into @counted (GameId, Pick, GOW) values (@gameId, @favoriteId, 0);
         exec UpdatePickCount @counted;
       end
     end
     commit;
     select @problem problem, iif(@problem is null, @gameId, null) gameId, @weekId weekId;`,
    { ...gameParams(game), gameId },
  );
  return toResult(result.recordset[0]);
}

export type DeleteGameResult = { ok: true; weekId: number } | { ok: false; problem: GameProblem };

/** Deletes a game that isn't final and has no picks. */
export async function deleteGame(gameId: number): Promise<DeleteGameResult> {
  const result = await query<{ problem: GameProblem | null; weekId: number | null }>(
    `set xact_abort on;
     ${CURRENT_SEASON}
     begin transaction;
     declare @weekId int, @official bit;
     select @weekId = g.WeekID, @official = g.Official
     from Game g with (updlock, holdlock)
     join Week w on w.WeekID = g.WeekID
     where g.GameID = @gameId and w.SeasonID = @seasonId;

     declare @problem varchar(20) = case
       when @weekId is null then 'not-found'
       when @official = 1 then 'official'
       when exists (select 1 from Pick with (updlock, holdlock) where GameID = @gameId)
         then 'has-picks'
     end;
     if @problem is null delete from Game where GameID = @gameId;
     commit;
     select @problem problem, @weekId weekId;`,
    { gameId },
  );
  const row = result.recordset[0];
  return row.problem || !row.weekId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, weekId: row.weekId };
}

export type ScoreInput = {
  favoriteScore: number | null; // both null to clear the score
  underdogScore: number | null;
  status: string | null; // e.g. "3rd Qtr 5:12"
  result: GameResult | null; // who covered; null with no score
  official: boolean; // final: counts in the standings
};

export type SetScoreResult =
  | { ok: true; weekId: number; weeksRebuilt: number }
  | { ok: false; problem: GameProblem };

/**
 * Sets a game's scores, status, result and Official, then (as the old site
 * did) runs SetGameExtras for the game's difficulty/quality points and
 * SetStandings for its week, plus every later week in the season, since
 * each week's standings include season-to-date totals. All in one
 * transaction. Only for games that have started.
 *
 * Result storage matches existing games: a cover sets WinnerID to that
 * team; a push sets Tie = 1 and WinnerID = null.
 */
export async function setScore(
  gameId: number,
  score: ScoreInput,
): Promise<SetScoreResult> {
  const result = await query<{
    problem: GameProblem | null;
    weekId: number | null;
    weeksRebuilt: number;
  }>(
    `set xact_abort on;
     declare @now datetime = ${NOW_EASTERN};
     ${CURRENT_SEASON}
     begin transaction;
     declare @weekId int, @weekSort int, @favoriteId int, @underdogId int, @gametime datetime;
     select @weekId = g.WeekID, @weekSort = w.Sort, @favoriteId = g.FavoriteID,
       @underdogId = g.UnderdogID, @gametime = g.Gametime
     from Game g with (updlock, holdlock)
     join Week w on w.WeekID = g.WeekID
     where g.GameID = @gameId and w.SeasonID = @seasonId;

     declare @problem varchar(20) = case
       when @weekId is null then 'not-found'
       when @gametime > @now then 'not-started'
     end;
     declare @weeksRebuilt int = 0;
     if @problem is null
     begin
       update Game set
         FavoriteScore = @favoriteScore, UnderdogScore = @underdogScore,
         Status = @status, Official = @official,
         WinnerID = case @result when 'favorite' then @favoriteId
                                 when 'underdog' then @underdogId end,
         Tie = iif(@result = 'push', 1, 0)
       where GameID = @gameId;

       exec SetGameExtras @gameId;

       -- This week and every later week: each includes season-to-date totals.
       declare @weeks table (WeekID int, Sort int);
       insert into @weeks
       select WeekID, Sort from Week
       where SeasonID = @seasonId and (Sort > @weekSort or WeekID = @weekId);
       declare @rebuild int;
       while exists (select 1 from @weeks)
       begin
         select top 1 @rebuild = WeekID from @weeks order by Sort, WeekID;
         exec SetStandings @rebuild;
         delete from @weeks where WeekID = @rebuild;
         set @weeksRebuilt += 1;
       end
     end
     commit;
     select @problem problem, @weekId weekId, @weeksRebuilt weeksRebuilt;`,
    {
      gameId,
      favoriteScore: score.favoriteScore,
      underdogScore: score.underdogScore,
      status: score.status,
      result: score.result,
      official: score.official,
    },
  );
  const row = result.recordset[0];
  return row.problem || !row.weekId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, weekId: row.weekId, weeksRebuilt: row.weeksRebuilt };
}

export type DeletePicksResult =
  | { ok: true; weekId: number; deleted: number }
  | { ok: false; problem: GameProblem };

/**
 * Deletes every pick on a game that isn't final (so the standings don't
 * change), and resets its pick counts. Players whose lock was on this game
 * lose that lock.
 */
export async function deleteGamePicks(gameId: number): Promise<DeletePicksResult> {
  const result = await query<{ problem: GameProblem | null; weekId: number | null; deleted: number }>(
    `set xact_abort on;
     ${CURRENT_SEASON}
     begin transaction;
     declare @weekId int, @official bit;
     select @weekId = g.WeekID, @official = g.Official
     from Game g with (updlock, holdlock)
     join Week w on w.WeekID = g.WeekID
     where g.GameID = @gameId and w.SeasonID = @seasonId;

     declare @problem varchar(20) = case
       when @weekId is null then 'not-found'
       when @official = 1 then 'official'
     end;
     declare @deleted int = 0;
     if @problem is null
     begin
       delete from Pick where GameID = @gameId;
       set @deleted = @@rowcount;
       update Game set favoritePickCount = 0, underdogPickCount = 0 where GameID = @gameId;
     end
     commit;
     select @problem problem, @weekId weekId, @deleted deleted;`,
    { gameId },
  );
  const row = result.recordset[0];
  return row.problem || !row.weekId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, weekId: row.weekId, deleted: row.deleted };
}
