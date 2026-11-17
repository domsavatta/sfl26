/** Column definitions for the standings tables (Standings and home pages). */
import type { StandingsColumn } from "@/components/standings-table";
import { formatPct, formatPoints } from "@/lib/format";
import type {
  OverallStandingRow,
  WeekStandingRow,
} from "@/models/standings";

export const overallColumns: readonly StandingsColumn<OverallStandingRow>[] = [
  { key: "rank", label: "", title: "Rank", align: "text-left" },
  { key: "playerName", label: "Player", title: "Player", align: "text-left" },
  { key: "wins", label: "W", title: "Wins", align: "text-center" },
  { key: "losses", label: "L", title: "Losses", align: "text-center" },
  {
    key: "winPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    format: formatPct,
  },
  {
    key: "weeklyWins",
    label: "WW",
    title: "Weekly wins",
    align: "text-center",
  },
  {
    key: "weeklyWinsWithTies",
    label: "WWT",
    title: "Weekly wins with ties",
    align: "text-center",
  },
  {
    key: "locksOfTheWeek",
    label: "LOW",
    title: "Locks of the week",
    align: "text-center",
  },
  {
    key: "topLocksOfTheWeek",
    label: "TLOW",
    title: "Top locks of the week",
    align: "text-center",
  },
  {
    key: "qualityPoints",
    label: "QP",
    title: "Quality picks",
    align: "text-center",
    format: (row) => formatPoints(row.qualityPoints),
  },
  {
    key: "difficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
  },
  {
    key: "gamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-right",
  },
];

const WEEK = "This week";
const PREV = "Previous rank";
const SEASON = "Season to date";

export const weekColumns: readonly StandingsColumn<WeekStandingRow>[] = [
  { key: "rank", label: "", title: "Rank", align: "text-left" },
  { key: "playerName", label: "Player", title: "Player", align: "text-left" },
  // This week
  { key: "wins", label: "W", title: "Wins", align: "text-center", group: WEEK },
  {
    key: "losses",
    label: "L",
    title: "Losses",
    align: "text-center",
    group: WEEK,
  },
  {
    key: "winPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    group: WEEK,
    format: formatPct,
  },
  {
    key: "lockOfTheWeek",
    label: "Lock",
    title: "Lock of the week (GOW points)",
    align: "text-center",
    group: WEEK,
    format: (r) => formatPoints(r.lockOfTheWeek),
  },
  {
    key: "qualityPoints",
    label: "QP",
    title: "Quality points",
    align: "text-center",
    group: WEEK,
    format: (r) => formatPoints(r.qualityPoints),
  },
  {
    key: "difficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
    group: WEEK,
  },
  {
    key: "gamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-center",
    group: WEEK,
  },
  // Previous weeks
  {
    key: "previousWeekRank",
    label: "PWR",
    title: "Previous week's rank",
    align: "text-center",
    group: PREV,
  },
  {
    key: "previousWeekRankWithTies",
    label: "PWRT",
    title: "Previous week's rank with ties",
    align: "text-center",
    group: PREV,
  },
  {
    key: "lastPreviousWeekRank",
    label: "LPWR",
    title: "Rank two weeks ago",
    align: "text-center",
    group: PREV,
  },
  {
    key: "lastPreviousWeekRankWithTies",
    label: "LPWRT",
    title: "Rank two weeks ago with ties",
    align: "text-center",
    group: PREV,
  },
  // Season to date
  {
    key: "overallRank",
    label: "Rk",
    title: "Overall rank",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallRankWithTies",
    label: "RkT",
    title: "Overall rank with ties",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallWins",
    label: "W",
    title: "Wins",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallLosses",
    label: "L",
    title: "Losses",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallWinPercentage",
    label: "Pct",
    title: "Win percentage",
    align: "text-center",
    group: SEASON,
    format: (r) =>
      formatPct({
        wins: r.overallWins,
        losses: r.overallLosses,
        winPercentage: r.overallWinPercentage,
      }),
  },
  {
    key: "weeklyWins",
    label: "WW",
    title: "Weekly wins",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "weeklyWinsWithTies",
    label: "WWT",
    title: "Weekly wins with ties",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "locksOfTheWeek",
    label: "LOW",
    title: "Locks of the week (correct locks, OGOW)",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "topLocksOfTheWeek",
    label: "TLOW",
    title: "Top locks of the week (best lock score, OGOWB)",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallQualityPoints",
    label: "QP",
    title: "Quality points",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallDifficultyPoints",
    label: "DP",
    title: "Difficulty points",
    align: "text-center",
    group: SEASON,
  },
  {
    key: "overallGamesBehind",
    label: "GB",
    title: "Games behind",
    align: "text-right",
    group: SEASON,
  },
];

/** The given columns, in the given order (e.g. a compact table). */
export function pickColumns<T>(
  columns: readonly StandingsColumn<T>[],
  keys: readonly (keyof T & string)[],
): StandingsColumn<T>[] {
  return keys.map((key) => {
    const col = columns.find((c) => c.key === key);
    if (!col) throw new Error(`Unknown standings column: ${key}`);
    return col;
  });
}
