/**
 * Data for the View Picks page.
 *
 * Picks are only returned for games that have started (gametime has passed),
 * so nobody can see other players' picks — including their lock — before
 * kickoff. The check is done in SQL, so unstarted picks never leave the
 * database; for those games only the fact that a pick was made is returned.
 *
 * Game.Gametime is stored as US Eastern wall-clock time (no offset), so it is
 * compared with the current Eastern time. The mssql driver returns it as a
 * Date whose UTC fields are that wall-clock time; format it with
 * timeZone "UTC" and label it ET.
 *
 * Visibility matches the Standings page: active seasons, live weeks, and PNG
 * players hidden.
 */
import { query } from "db";

export type PicksWeek = {
  weekId: number;
  weekName: string; // e.g. "Week 09"
};

export type PicksSeason = {
  seasonId: number;
  seasonName: string; // e.g. "2023 Season"
  isCurrent: boolean;
  weeks: PicksWeek[]; // live weeks with games, oldest first
};

export type Team = {
  teamId: number;
  name: string;
  score: number | null;
  location: "Home" | "Away" | "Neutral";
};

export type PicksGame = {
  gameId: number;
  league: string; // "NFL" or "College"
  favorite: Team;
  underdog: Team;
  spread: number | null;
  gametime: Date; // Eastern wall-clock time in the UTC fields (see above)
  storyline: string | null;
  status: string | null; // e.g. "Final", "2nd Qtr: 11:42"
  official: boolean;
  tie: boolean; // push against the spread
  winnerId: number | null; // team that covered
  started: boolean;
};

export type PickResult = "win" | "loss" | "push" | "pending";

export type PlayerPick = {
  teamId: number;
  teamName: string;
  isLock: boolean;
  result: PickResult;
};

export type PicksPlayer = {
  playerId: number;
  playerName: string;
  rank: number | null; // overall (combined) season rank; null if unranked
  picks: Record<number, PlayerPick>; // by gameId; started games only
  pickMade: Set<number>; // gameIds of unstarted games this player has picked
  wins: number;
  losses: number;
};

export type WeekPicks = {
  games: PicksGame[];
  players: PicksPlayer[];
};

/** Current US Eastern time as a datetime, to compare with Game.Gametime. */
const NOW_EASTERN =
  "cast(sysdatetimeoffset() at time zone 'Eastern Standard Time' as datetime)";

/** Seasons (newest first), each with its live weeks that have games. */
export async function getPicksSeasons(): Promise<PicksSeason[]> {
  const result = await query<unknown>(`
    select s.SeasonID seasonId, s.Name seasonName, s.IsCurrent isCurrent
    from Season s
    where s.Active = 1
      and exists (
        select 1 from Week w join Game g on g.WeekID = w.WeekID
        where w.SeasonID = s.SeasonID and w.Live = 1)
    order by s.Sort desc, s.SeasonID desc;

    select w.SeasonID seasonId, w.WeekID weekId, w.Name weekName
    from Week w
    join Season s on s.SeasonID = w.SeasonID and s.Active = 1
    where w.Live = 1
      and exists (select 1 from Game g where g.WeekID = w.WeekID)
    order by w.SeasonID, w.Sort;
  `);
  const [seasonRows, weekRows] = result.recordsets as unknown as [
    { seasonId: number; seasonName: string; isCurrent: boolean }[],
    { seasonId: number; weekId: number; weekName: string }[],
  ];

  return seasonRows.map((s) => ({
    ...s,
    weeks: weekRows
      .filter((w) => w.seasonId === s.seasonId)
      .map(({ weekId, weekName }) => ({ weekId, weekName })),
  }));
}

type GameDbRow = {
  gameId: number;
  league: string;
  favoriteId: number;
  favoriteName: string;
  favoriteScore: number | null;
  underdogId: number;
  underdogName: string;
  underdogScore: number | null;
  favoriteSite: number; // 1 favorite at home, 2 underdog at home, 3 neutral
  spread: number | null;
  gametime: Date;
  storyline: string | null;
  status: string | null;
  official: boolean;
  tie: boolean;
  winnerId: number | null;
  started: boolean;
};

type PlayerDbRow = {
  playerId: number;
  playerName: string;
  rank: number | null;
};

type PickDbRow = {
  playerId: number;
  gameId: number;
  teamId: number;
  isLock: boolean;
};

const locations = (site: number): [Team["location"], Team["location"]] =>
  site === 1 ? ["Home", "Away"] : site === 2 ? ["Away", "Home"] : ["Neutral", "Neutral"];

export async function getWeekPicks(
  seasonId: number,
  weekId: number,
): Promise<WeekPicks> {
  const result = await query<unknown>(
    `declare @now datetime = ${NOW_EASTERN};

     -- Only a live week in an active season.
     declare @week int = (
       select w.WeekID from Week w
       join Season s on s.SeasonID = w.SeasonID and s.Active = 1
       where w.WeekID = @weekId and w.SeasonID = @seasonId and w.Live = 1);

     select g.GameID gameId, f.League league,
       g.FavoriteID favoriteId, f.Name favoriteName, g.FavoriteScore favoriteScore,
       g.UnderdogID underdogId, u.Name underdogName, g.UnderdogScore underdogScore,
       g.FavoriteSite favoriteSite, g.Spread spread, g.Gametime gametime,
       g.Storyline storyline, g.Status status, g.Official official, g.Tie tie,
       g.WinnerID winnerId,
       cast(iif(g.Gametime <= @now, 1, 0) as bit) started
     from Game g
     join Team f on f.TeamID = g.FavoriteID
     join Team u on u.TeamID = g.UnderdogID
     where g.WeekID = @week
     order by g.Gametime, g.GameID;

     -- Everyone in the season, plus anyone who picked this week.
     with players as (
       select ps.PlayerId from PlayersSeason ps where ps.SeasonID = @seasonId
       union
       select p.PlayerId from Pick p join Game g on g.GameID = p.GameID
       where g.WeekID = @week
     )
     select p.PlayerId playerId, p.Name playerName, ss.Rank rank
     from players pl
     join Player p on p.PlayerId = pl.PlayerId and p.PNG = 0
     left join SeasonStanding ss
       on ss.SeasonID = @seasonId and ss.PlayerId = pl.PlayerId and ss.League = 'O'
     where @week is not null
     order by iif(ss.Rank is null, 1, 0), ss.Rank, p.Name;

     -- Started games only: picks stay hidden until kickoff.
     select p.PlayerId playerId, p.GameID gameId, p.Pick teamId, p.GOW isLock
     from Pick p
     join Game g on g.GameID = p.GameID
     where g.WeekID = @week and g.Gametime <= @now;

     -- Unstarted games: only whether a pick exists, never the team or lock.
     select distinct p.PlayerId playerId, p.GameID gameId
     from Pick p
     join Game g on g.GameID = p.GameID
     where g.WeekID = @week and g.Gametime > @now;`,
    { seasonId, weekId },
  );
  const [gameRows, playerRows, pickRows, pickMadeRows] =
    result.recordsets as unknown as [
      GameDbRow[],
      PlayerDbRow[],
      PickDbRow[],
      { playerId: number; gameId: number }[],
    ];

  const games: PicksGame[] = gameRows.map((g) => {
    const [favoriteLocation, underdogLocation] = locations(g.favoriteSite);
    return {
      gameId: g.gameId,
      league: g.league,
      favorite: {
        teamId: g.favoriteId,
        name: g.favoriteName,
        score: g.favoriteScore,
        location: favoriteLocation,
      },
      underdog: {
        teamId: g.underdogId,
        name: g.underdogName,
        score: g.underdogScore,
        location: underdogLocation,
      },
      spread: g.spread,
      gametime: g.gametime,
      storyline: g.storyline,
      status: g.status,
      official: g.official,
      tie: g.tie,
      winnerId: g.winnerId,
      started: g.started,
    };
  });
  const gamesById = new Map(games.map((g) => [g.gameId, g]));

  const players: PicksPlayer[] = playerRows.map((p) => ({
    ...p,
    picks: {},
    pickMade: new Set<number>(),
    wins: 0,
    losses: 0,
  }));
  const playersById = new Map(players.map((p) => [p.playerId, p]));

  for (const pick of pickRows) {
    const player = playersById.get(pick.playerId);
    const game = gamesById.get(pick.gameId);
    if (!player || !game) continue; // e.g. a hidden (PNG) player
    // A few old picks name a team that isn't in the game; skip them.
    const team = [game.favorite, game.underdog].find(
      (t) => t.teamId === pick.teamId,
    );
    if (!team) continue;

    const result: PickResult = !game.official
      ? "pending"
      : game.tie
        ? "push"
        : game.winnerId === pick.teamId
          ? "win"
          : "loss";
    if (result === "win") player.wins++;
    if (result === "loss") player.losses++;
    player.picks[pick.gameId] = {
      teamId: pick.teamId,
      teamName: team.name,
      isLock: pick.isLock,
      result,
    };
  }

  for (const { playerId, gameId } of pickMadeRows)
    playersById.get(playerId)?.pickMade.add(gameId);

  return { games, players };
}
