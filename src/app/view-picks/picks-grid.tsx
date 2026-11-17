import ScrollX from "@/components/scroll-x";
import type {
  PickResult,
  PicksGame,
  PicksPlayer,
} from "@/models/picks";

const resultClass: Record<PickResult, string> = {
  win: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  loss: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  push: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  pending: "text-black dark:text-white",
};

const resultLabel: Record<PickResult, string> = {
  win: "correct",
  loss: "incorrect",
  push: "push",
  pending: "in progress",
};

/**
 * Players (rows, by overall rank) × games (columns). Rank and player are
 * pinned so the picks scroll sideways on a phone. Picks for games that
 * haven't started are not loaded; those cells show a checkmark if the player
 * has picked, so everyone can see who still needs to.
 */
export default function PicksGrid({
  games,
  players,
}: {
  games: PicksGame[];
  players: PicksPlayer[];
}) {
  const cell = "py-2 px-1 sm:px-2 whitespace-nowrap";
  const pinnedBg =
    "bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800";
  const rankCell = `sticky left-0 z-[1] w-8 min-w-8 pl-0 text-left ${pinnedBg}`;
  const nameCell = `sticky left-8 z-[1] min-w-[5.5rem] sm:min-w-[7rem] max-w-[7rem] sm:max-w-[9rem] text-left ${pinnedBg}`;

  return (
    <ScrollX>
      <table className="w-full text-sm">
        <caption className="sr-only">
          Each player&apos;s picks, by overall season rank
        </caption>
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 align-bottom">
            <th scope="col" className={`${cell} ${rankCell}`}>
              <span className="sr-only">Rank</span>
            </th>
            <th
              scope="col"
              className={`${cell} ${nameCell} font-semibold text-zinc-700 dark:text-zinc-300`}
            >
              Player
            </th>
            <th
              scope="col"
              className={`${cell} text-center font-semibold text-zinc-700 dark:text-zinc-300`}
            >
              <abbr title="This week's record" className="no-underline">
                W-L
              </abbr>
            </th>
            {games.map((g, i) => (
              <th
                key={g.gameId}
                scope="col"
                title={`${g.favorite.name} ${line(g, "favorite")} vs ${g.underdog.name}`}
                className={`${cell} min-w-[6rem] max-w-[8rem] text-left font-normal text-xs text-zinc-500 dark:text-zinc-400`}
              >
                <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                  {i + 1}
                </span>
                <span className="block truncate">{g.favorite.name}</span>
                <span className="block truncate">{g.underdog.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr
              key={p.playerId}
              className="group border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <td
                className={`${cell} ${rankCell} font-semibold tabular-nums text-black dark:text-white`}
              >
                {p.rank ?? ""}
              </td>
              <th
                scope="row"
                className={`${cell} ${nameCell} font-medium text-black dark:text-white`}
              >
                <span className="block truncate">{p.playerName}</span>
              </th>
              <td className={`${cell} text-center tabular-nums text-black dark:text-white`}>
                {p.wins}-{p.losses}
              </td>
              {games.map((g) => {
                const pick = p.picks[g.gameId];
                if (!pick && p.pickMade.has(g.gameId))
                  return (
                    <td
                      key={g.gameId}
                      className={`${cell} text-green-700 dark:text-green-400`}
                      title="Picked; shown at kickoff"
                    >
                      <span aria-hidden>✓</span>
                      <span className="sr-only">Picked, hidden until kickoff</span>
                    </td>
                  );
                if (!pick)
                  return (
                    <td
                      key={g.gameId}
                      className={`${cell} text-zinc-400 dark:text-zinc-600`}
                    >
                      <span aria-hidden>—</span>
                      <span className="sr-only">
                        {g.started ? "No pick" : "Hidden until kickoff"}
                      </span>
                    </td>
                  );
                return (
                  <td key={g.gameId} className={`${cell} max-w-[8rem]`}>
                    <span
                      className={`block truncate rounded px-1.5 py-0.5 ${resultClass[pick.result]} ${
                        pick.isLock ? "font-bold" : ""
                      }`}
                      title={`${pick.teamName}${pick.isLock ? " (lock)" : ""}, ${resultLabel[pick.result]}`}
                    >
                      {pick.isLock && (
                        <>
                          <span aria-hidden>★ </span>
                          <span className="sr-only">Lock: </span>
                        </>
                      )}
                      {pick.teamName}
                      <span className="sr-only">, {resultLabel[pick.result]}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}

/** "-3.5" / "+3.5", or "PK" for a pick'em. */
export function line(game: PicksGame, side: "favorite" | "underdog") {
  if (!game.spread) return "PK";
  return `${side === "favorite" ? "-" : "+"}${game.spread}`;
}
