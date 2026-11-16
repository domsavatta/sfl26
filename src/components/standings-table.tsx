import type { ReactNode } from "react";
import ScrollX from "./scroll-x";

export type StandingsColumn<T> = {
  readonly key: keyof T & string;
  readonly label: string;
  /** Full name, shown on hover. */
  readonly title: string;
  /** Tailwind text alignment class, e.g. "text-center". */
  readonly align: string;
  /** Custom cell content; defaults to the raw value ("—" for null). */
  readonly format?: (row: T) => ReactNode;
  /**
   * Optional heading shared by consecutive columns (e.g. "This week").
   * If any column has one, an extra header row is shown and groups are
   * separated by a divider.
   */
  readonly group?: string;
};

/**
 * Player standings table. The rank and player columns are pinned on the left,
 * so when a table has more columns than fit (e.g. on a phone) the stats
 * scroll sideways while you can still see whose row you're on.
 */
export default function StandingsTable<
  T extends { playerId: number; rank: number; playerName: string },
>({
  columns,
  rows,
  caption,
}: {
  columns: readonly StandingsColumn<T>[];
  rows: T[];
  caption?: string;
}) {
  // Very wide tables (e.g. the week view's 25 columns) use tighter padding
  // so they fit on a desktop screen without scrolling.
  const dense = columns.length > 14;
  const cell = `py-2 px-1 ${dense ? "lg:px-1.5" : "sm:px-2"} last:pr-0 whitespace-nowrap`;
  // Pinned cells need their own background so scrolled cells don't show through.
  const pinnedBg =
    "bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800";
  const pinned = (key: string) =>
    key === "rank"
      ? `sticky left-0 z-[1] w-8 min-w-8 pl-0 sm:pl-0 ${pinnedBg}`
      : key === "playerName"
        ? `sticky left-8 z-[1] w-full min-w-[5.5rem] sm:min-w-[7rem] max-w-0 ${pinnedBg}`
        : "";

  // Group header spans, and which columns start a new group (get a divider).
  const grouped = columns.some((c) => c.group);
  const spans: { group?: string; span: number; first: StandingsColumn<T> }[] =
    [];
  for (const col of columns) {
    const last = spans[spans.length - 1];
    if (last && col.group && last.group === col.group) last.span++;
    else spans.push({ group: col.group, span: 1, first: col });
  }
  const startsGroup = new Set<string>(
    spans.filter((s, i) => s.group && i > 0).map((s) => s.first.key),
  );
  const divider = (key: string) =>
    startsGroup.has(key)
      ? "border-l border-zinc-200 dark:border-zinc-700 pl-2 sm:pl-3"
      : "";

  const value = (row: T, col: StandingsColumn<T>): ReactNode => {
    if (col.key === "playerName")
      return <span className="block truncate">{row.playerName}</span>;
    if (col.format) return col.format(row);
    const v = row[col.key];
    return v === null || v === undefined ? "—" : String(v);
  };

  return (
    <ScrollX>
      <table className="w-full text-sm tabular-nums">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          {grouped && (
            <tr>
              {spans.map((s) =>
                s.group ? (
                  <th
                    key={s.first.key}
                    scope="colgroup"
                    colSpan={s.span}
                    className={`${cell} ${divider(s.first.key)} pb-0 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400`}
                  >
                    {s.group}
                  </th>
                ) : (
                  // Ungrouped columns get their own empty cell (keeps pinning).
                  <td
                    key={s.first.key}
                    className={`${cell} ${pinned(s.first.key)}`}
                  />
                ),
              )}
            </tr>
          )}
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                title={col.title || undefined}
                className={`${col.align} ${cell} ${pinned(col.key)} ${divider(col.key)} font-semibold text-zinc-700 dark:text-zinc-300`}
              >
                {col.label ? (
                  <abbr title={col.title} className="no-underline">
                    {col.label}
                  </abbr>
                ) : (
                  <span className="sr-only">{col.title || "Rank"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.playerId}
              className="group border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${col.align} ${cell} ${pinned(col.key)} ${divider(col.key)} text-black dark:text-white ${
                    col.key === "rank" ? "font-semibold" : ""
                  } ${col.key === "playerName" ? "font-medium" : ""}`}
                >
                  {value(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}
