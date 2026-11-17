/** Display formatting shared by the home, standings and picks pages. */

/**
 * Game.Gametime is US Eastern wall-clock time stored without an offset; the
 * mssql driver returns it as a Date whose UTC fields hold that time. So format
 * it in UTC and label it ET.
 */
export const formatGametime = (gametime: Date) =>
  `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(gametime)} ET`;

/** The spread from one side: "-3.5" / "+3.5", or "PK" for a pick'em. */
export function line(
  game: { spread: number | null },
  side: "favorite" | "underdog",
) {
  if (!game.spread) return "PK";
  return `${side === "favorite" ? "-" : "+"}${game.spread}`;
}

/** Baseball-style: .745, 1.000; "—" with no games. */
export const formatPct = (row: {
  wins: number;
  losses: number;
  winPercentage: number;
}) =>
  row.wins + row.losses === 0
    ? "—"
    : row.winPercentage.toFixed(3).replace(/^0/, "");

/** Quality points are stored as floats (e.g. 39.299999); show at most 1 decimal. */
export const formatPoints = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** A positive integer from a search param, or null. */
export const toInt = (value: string | string[] | undefined) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
