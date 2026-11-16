/**
 * Data for the Standings page.
 *
 * Reads the precalculated SeasonStanding / WeekStanding tables. Those are
 * read-only, derived data: the SetStandings stored procedure rebuilds them
 * (for the week and its season, for each league) from games and picks.
 *
 * Visibility: only active seasons and live weeks are shown. Players marked
 * PNG (persona non grata) are hidden from every table, but their rows are
 * still part of the stored calculations (ranks, games behind, weekly wins),
 * so the remaining ranks may skip a number.
 */
import { query } from "db";

export type StandingsWeek = {
  weekId: number;
  weekName: string; // e.g. "Week 09"
};

export type StandingsSeason = {
  seasonId: number;
  seasonName: string; // e.g. "2023 Season"
  isCurrent: boolean;
  weeks: StandingsWeek[]; // weeks with standings, oldest first
};

export type OverallStandingRow = {
  rank: number;
  playerId: number;
  playerName: string;
  wins: number;
  losses: number;
  winPercentage: number; // 0–1; wins / (wins + losses)
  weeklyWins: number; // weeks ranked 1st
  weeklyWinsWithTies: number; // weeks with 0 games behind
  locksOfTheWeek: number; // correct locks
  topLocksOfTheWeek: number; // weeks your lock score was the week's best
  qualityPoints: number;
  difficultyPoints: number;
  gamesBehind: number;
};

export type WeekStandings = {
  combined: WeekStandingRow[];
  college: WeekStandingRow[];
  nfl: WeekStandingRow[];
};

export type OverallStandings = {
  combined: OverallStandingRow[];
  college: OverallStandingRow[];
  nfl: OverallStandingRow[];
};

export type WeekStandingRow = {
  rank: number;
  playerId: number;
  playerName: string;
  // This week
  wins: number;
  losses: number;
  winPercentage: number; // 0–1; wins / (wins + losses)
  lockOfTheWeek: number; // GOW: quality points earned by the lock (0 if it lost)
  qualityPoints: number;
  difficultyPoints: number;
  gamesBehind: number;
  // Rank in earlier weeks; null when there is no such week (e.g. week 1)
  previousWeekRank: number | null;
  previousWeekRankWithTies: number | null;
  lastPreviousWeekRank: number | null;
  lastPreviousWeekRankWithTies: number | null;
  // Season to date, as of this week
  overallRank: number;
  overallRankWithTies: number;
  overallWins: number;
  overallLosses: number;
  overallWinPercentage: number;
  weeklyWins: number;
  weeklyWinsWithTies: number;
  locksOfTheWeek: number; // OGOW: correct locks
  topLocksOfTheWeek: number; // OGOWB: weeks with the best lock score (4th overall tiebreaker)
  overallQualityPoints: number; // stored as a whole number in WeekStanding
  overallDifficultyPoints: number;
  overallGamesBehind: number;
};

/** League codes used by SeasonStanding / WeekStanding. */
const LEAGUE = { combined: "O", college: "COLLEGE", nfl: "NFL" } as const;

const winPercentage = (wins: number, losses: number) =>
  wins + losses ? wins / (wins + losses) : 0;

/** Seasons (newest first) that have standings, each with its weeks. */
export async function getStandingsSeasons(): Promise<StandingsSeason[]> {
  const result = await query<unknown>(`
    select s.SeasonID seasonId, s.Name seasonName, s.IsCurrent isCurrent
    from Season s
    where s.Active = 1
      and exists (select 1 from SeasonStanding ss where ss.SeasonID = s.SeasonID)
    order by s.Sort desc, s.SeasonID desc;

    select w.SeasonID seasonId, w.WeekID weekId, w.Name weekName
    from Week w
    join Season s on s.SeasonID = w.SeasonID and s.Active = 1
    where w.Live = 1
      and exists (select 1 from WeekStanding ws where ws.WeekID = w.WeekID and ws.League = '${LEAGUE.combined}')
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

type SeasonStandingDbRow = {
  league: string;
  rank: number;
  playerId: number;
  playerName: string;
  correctPicks: number;
  totalGames: number;
  weeklyWins: number;
  weeklyWinsWithTies: number;
  gow: number;
  gowb: number;
  qualityPoints: number;
  difficultyPoints: number;
  gamesBehind: number;
};

export async function getOverallStandings(
  seasonId: number,
): Promise<OverallStandings | null> {
  const recordset: SeasonStandingDbRow[] = (
    await query<SeasonStandingDbRow>(
      `select ss.League league, ss.Rank rank, p.PlayerId playerId, p.Name playerName,
       ss.CorrectPicks correctPicks, ss.TotalGames totalGames,
       ss.WeeklyWins weeklyWins, ss.WeeklyWinsWithTies weeklyWinsWithTies,
       ss.GOW gow, ss.GOWB gowb, ss.QualityPoints qualityPoints,
       ss.DifficultyPoints difficultyPoints, ss.GamesBehind gamesBehind
     from SeasonStanding ss
     join Season s on s.SeasonID = ss.SeasonID and s.Active = 1
     join Player p on p.PlayerId = ss.PlayerId and p.PNG = 0 -- hidden, not recalculated
     where ss.SeasonID = @seasonId
     order by ss.League, ss.Rank, p.Name`,
      { seasonId },
    )
  ).recordset;
  if (!recordset.length) return null;

  const rows = (league: string): OverallStandingRow[] =>
    recordset
      .filter((r) => r.league.toUpperCase() === league)
      .map((r) => {
        const losses = r.totalGames - r.correctPicks;
        return {
          rank: r.rank,
          playerId: r.playerId,
          playerName: r.playerName,
          wins: r.correctPicks,
          losses,
          winPercentage: winPercentage(r.correctPicks, losses),
          weeklyWins: r.weeklyWins,
          weeklyWinsWithTies: r.weeklyWinsWithTies,
          locksOfTheWeek: r.gow,
          topLocksOfTheWeek: r.gowb,
          qualityPoints: r.qualityPoints,
          difficultyPoints: r.difficultyPoints,
          gamesBehind: r.gamesBehind,
        };
      });

  return {
    combined: rows(LEAGUE.combined),
    college: rows(LEAGUE.college),
    nfl: rows(LEAGUE.nfl),
  };
}

type WeekStandingDbRow = {
  league: string;
  rank: number;
  playerId: number;
  playerName: string;
  correctPicks: number;
  totalGames: number;
  gow: number;
  qualityPoints: number;
  difficultyPoints: number;
  gamesBehind: number;
  pwr: number;
  pwrt: number;
  lpwr: number;
  lpwrt: number;
  oRank: number;
  oRankWithTies: number;
  oCorrectPicks: number;
  oTotalGames: number;
  oWeeklyWins: number;
  oWeeklyWinsWithTies: number;
  oGow: number;
  oGowb: number;
  oQualityPoints: number;
  oDifficultyPoints: number;
  oGamesBehind: number;
};

/** The procedures store 0 for "no previous week". */
const rankOrNull = (rank: number | null) => (rank ? rank : null);

export async function getWeekStandings(
  seasonId: number,
  weekId: number,
): Promise<WeekStandings | null> {
  const recordset: WeekStandingDbRow[] = (
    await query<WeekStandingDbRow>(
      `select ws.League league, ws.Ranking rank, p.PlayerId playerId, p.Name playerName,
       ws.CorrectPicks correctPicks, ws.TotalGames totalGames, ws.GOW gow,
       ws.QualityPoints qualityPoints, ws.DifficultyPoints difficultyPoints,
       ws.GamesBehind gamesBehind,
       ws.PreviousWeekRank pwr, ws.PWRWithTies pwrt,
       ws.LastPreviousWeekRank lpwr, ws.LPWRWithTies lpwrt,
       ws.ORanking oRank, ws.ORankingWithTies oRankWithTies,
       ws.OCorrectPicks oCorrectPicks, ws.OTotalGames oTotalGames,
       ws.OWeeklyWins oWeeklyWins, ws.OWeeklyWinsWithTies oWeeklyWinsWithTies,
       ws.OGOW oGow, ws.OGOWB oGowb,
       ws.OQualityPoints oQualityPoints, ws.ODifficultyPoints oDifficultyPoints,
       ws.OGamesBehind oGamesBehind
     from WeekStanding ws
     join Week w on w.WeekID = ws.WeekID and w.SeasonID = @seasonId and w.Live = 1
     join Season s on s.SeasonID = w.SeasonID and s.Active = 1
     join Player p on p.PlayerId = ws.PlayerId and p.PNG = 0 -- hidden, not recalculated
     where ws.WeekID = @weekId
     order by ws.League, ws.Ranking, p.Name`,
      { seasonId, weekId },
    )
  ).recordset;
  if (!recordset.length) return null;

  const toRow = (r: WeekStandingDbRow): WeekStandingRow => {
    const losses = r.totalGames - r.correctPicks;
    const overallLosses = r.oTotalGames - r.oCorrectPicks;
    return {
      rank: r.rank,
      playerId: r.playerId,
      playerName: r.playerName,
      wins: r.correctPicks,
      losses,
      winPercentage: winPercentage(r.correctPicks, losses),
      lockOfTheWeek: r.gow,
      qualityPoints: r.qualityPoints,
      difficultyPoints: r.difficultyPoints,
      gamesBehind: r.gamesBehind,
      previousWeekRank: rankOrNull(r.pwr),
      previousWeekRankWithTies: rankOrNull(r.pwrt),
      lastPreviousWeekRank: rankOrNull(r.lpwr),
      lastPreviousWeekRankWithTies: rankOrNull(r.lpwrt),
      overallRank: r.oRank,
      overallRankWithTies: r.oRankWithTies,
      overallWins: r.oCorrectPicks,
      overallLosses,
      overallWinPercentage: winPercentage(r.oCorrectPicks, overallLosses),
      weeklyWins: r.oWeeklyWins,
      weeklyWinsWithTies: r.oWeeklyWinsWithTies,
      locksOfTheWeek: r.oGow,
      topLocksOfTheWeek: r.oGowb,
      overallQualityPoints: r.oQualityPoints,
      overallDifficultyPoints: r.oDifficultyPoints,
      overallGamesBehind: r.oGamesBehind,
    };
  };

  // Note: in a week where a league had no official games, the procedures
  // still write rows (all 0-0) whose season-to-date weekly-win counts are
  // off by one, so callers should not display a league with no games.
  const rows = (league: string) =>
    recordset.filter((r) => r.league.toUpperCase() === league).map(toRow);

  return {
    combined: rows(LEAGUE.combined),
    college: rows(LEAGUE.college),
    nfl: rows(LEAGUE.nfl),
  };
}
