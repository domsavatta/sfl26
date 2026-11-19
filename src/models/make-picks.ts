/**
 * Data and saving for the Make Picks page.
 *
 * Open weeks are the current season's live weeks that aren't official yet
 * (as on the home page) and still have a game that hasn't started. Only
 * games that haven't started can be picked.
 *
 * Lock (GOW) rules, enforced here in SQL rather than trusted from the form:
 * - at most one lock per week;
 * - once a player's lock game has started, their lock for that week can't be
 *   changed or moved.
 *
 * Saving writes Pick rows directly (in one transaction) instead of calling
 * the SetPicks procedure: SetPicks fails when a player has started locks in
 * two open weeks ("WeekID = (subquery)" returns two rows) and doesn't check
 * the team, the season or one-lock-per-week. It still runs UpdatePickCount
 * so Game.favoritePickCount / underdogPickCount stay current.
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

export type MakePicksGame = PicksGame & {
  pickTeamId: number | null; // the player's current pick
  isLock: boolean;
};

export type MakePicksWeek = {
  weekId: number;
  weekName: string;
  /** Set when this week's lock is on a game that has started (can't change). */
  startedLock: { teamName: string; opponentName: string } | null;
  games: MakePicksGame[]; // games that haven't started, by gametime
};

export type MakePicksData = {
  season: { seasonId: number; seasonName: string } | null;
  inSeason: boolean; // the player is in the current season
  weeks: MakePicksWeek[];
};

/** Current-season, live, unofficial weeks; needs @seasonId. */
const OPEN_WEEK = "w.SeasonID = @seasonId and w.Live = 1 and w.Official = 0";

const CURRENT_SEASON = `declare @seasonId int = (
  select top 1 s.SeasonID from Season s
  where s.IsCurrent = 1 and s.Active = 1
  order by s.Sort desc);`;

export async function getMakePicks(playerId: number): Promise<MakePicksData> {
  const result = await query<unknown>(
    `declare @now datetime = ${NOW_EASTERN};
     ${CURRENT_SEASON}

     select s.SeasonID seasonId, s.Name seasonName,
       cast(iif(exists (select 1 from PlayersSeason ps
         where ps.SeasonID = s.SeasonID and ps.PlayerId = @playerId), 1, 0) as bit) inSeason
     from Season s where s.SeasonID = @seasonId;

     select w.WeekID weekId, w.Name weekName
     from Week w
     where ${OPEN_WEEK}
       and exists (select 1 from Game g where g.WeekID = w.WeekID and g.Gametime > @now)
     order by w.Sort;

     select g.WeekID weekId, ${GAME_COLUMNS},
       pk.Pick pickTeamId, cast(isnull(pk.GOW, 0) as bit) isLock
     ${GAME_FROM}
     join Week w on w.WeekID = g.WeekID
     left join Pick pk on pk.GameID = g.GameID and pk.PlayerId = @playerId
     where ${OPEN_WEEK} and g.Gametime > @now
     order by g.Gametime, g.GameID;

     select g.WeekID weekId, t.Name teamName,
       iif(t.TeamID = g.FavoriteID, u.Name, f.Name) opponentName
     from Pick pk
     join Game g on g.GameID = pk.GameID
     join Week w on w.WeekID = g.WeekID
     join Team t on t.TeamID = pk.Pick
     join Team f on f.TeamID = g.FavoriteID
     join Team u on u.TeamID = g.UnderdogID
     where pk.PlayerId = @playerId and pk.GOW = 1 and g.Gametime <= @now
       and ${OPEN_WEEK};`,
    { playerId },
  );
  const [seasonRows, weekRows, gameRows, startedLockRows] =
    result.recordsets as unknown as [
      { seasonId: number; seasonName: string; inSeason: boolean }[],
      { weekId: number; weekName: string }[],
      (GameDbRow & {
        weekId: number;
        pickTeamId: number | null;
        isLock: boolean;
      })[],
      { weekId: number; teamName: string; opponentName: string }[],
    ];

  const season = seasonRows[0];
  if (!season) return { season: null, inSeason: false, weeks: [] };

  return {
    season: { seasonId: season.seasonId, seasonName: season.seasonName },
    inSeason: season.inSeason,
    weeks: weekRows.map((w) => {
      const lock = startedLockRows.find((l) => l.weekId === w.weekId);
      return {
        ...w,
        startedLock: lock
          ? { teamName: lock.teamName, opponentName: lock.opponentName }
          : null,
        games: gameRows
          .filter((g) => g.weekId === w.weekId)
          .map((g) => ({
            ...toGame(g),
            pickTeamId: g.pickTeamId,
            // A started lock is shown separately; never a lock here.
            isLock: g.isLock && !lock,
          })),
      };
    }),
  };
}

export type NewPick = { gameId: number; teamId: number; isLock: boolean };

export type SavePicksResult = {
  saved: number; // picks accepted (changed or unchanged)
  rejected: number; // e.g. the game started while the page was open
};

/**
 * Saves a player's picks. Pass every pick for the week(s) being saved, with
 * isLock on at most one game per week; picks for games that have started,
 * aren't in an open week, or name a team not in the game are ignored.
 * Throws if more than one lock is given for a week.
 */
export async function savePicks(
  playerId: number,
  picks: NewPick[],
): Promise<SavePicksResult> {
  if (!picks.length) return { saved: 0, rejected: 0 };

  const result = await query<{ saved: number }>(
    `set xact_abort on;
     begin transaction;

     declare @now datetime = ${NOW_EASTERN};
     ${CURRENT_SEASON}

     declare @valid table (
       GameID int primary key, Pick int not null, GOW bit not null, WeekID int not null);

     insert into @valid (GameID, Pick, GOW, WeekID)
     select p.GameId, p.Pick, p.GOW, g.WeekID
     from (select distinct GameId, Pick, GOW from @Picks) p
     join Game g on g.GameID = p.GameId
     join Week w on w.WeekID = g.WeekID
     where ${OPEN_WEEK}
       and g.Gametime > @now
       and p.Pick in (g.FavoriteID, g.UnderdogID)
       and exists (select 1 from PlayersSeason ps
         where ps.SeasonID = @seasonId and ps.PlayerId = @playerId);

     if exists (select 1 from @valid where GOW = 1 group by WeekID having count(*) > 1)
       throw 50001, 'Only one lock per week.', 1;

     -- A week whose lock has started keeps it: no new lock that week.
     update v set GOW = 0
     from @valid v
     where exists (
       select 1 from Pick pk join Game g on g.GameID = pk.GameID
       where pk.PlayerId = @playerId and pk.GOW = 1
         and g.WeekID = v.WeekID and g.Gametime <= @now);

     -- Moving a lock: clear the old (unstarted) lock in that week.
     update pk set GOW = 0, Updated = @now
     from Pick pk
     join Game g on g.GameID = pk.GameID
     where pk.PlayerId = @playerId and pk.GOW = 1 and g.Gametime > @now
       and g.WeekID in (select WeekID from @valid where GOW = 1)
       and pk.GameID not in (select GameID from @valid where GOW = 1);

     update pk set Pick = v.Pick, GOW = v.GOW, Updated = @now
     from Pick pk
     join @valid v on v.GameID = pk.GameID
     where pk.PlayerId = @playerId and (pk.Pick <> v.Pick or pk.GOW <> v.GOW);

     insert into Pick (PlayerId, GameID, Pick, Updated, GOW)
     select @playerId, v.GameID, v.Pick, @now, v.GOW
     from @valid v
     where not exists (
       select 1 from Pick pk where pk.PlayerId = @playerId and pk.GameID = v.GameID);

     declare @counted dbo.MakePicks;
     insert into @counted (GameId, Pick, GOW) select GameID, Pick, GOW from @valid;
     exec UpdatePickCount @counted;

     commit;

     select count(*) saved from @valid;`,
    {
      playerId,
      Picks: {
        tableType: "dbo.MakePicks",
        columns: [
          { name: "GameId", type: "int" },
          { name: "Pick", type: "int" },
          { name: "GOW", type: "bit" },
        ],
        rows: picks.map((p) => [p.gameId, p.teamId, p.isLock]),
      },
    },
  );
  const saved = result.recordset[0]?.saved ?? 0;
  return { saved, rejected: picks.length - saved };
}
