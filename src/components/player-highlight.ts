/**
 * Row styles for player tables, so the signed-in player's row stands out.
 * Pinned (sticky) cells need their own opaque background so scrolled cells
 * don't show through, which is why the highlight colours are solid.
 */
export function playerRowStyles(highlighted: boolean) {
  return highlighted
    ? {
        row: "group border-b border-zinc-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors",
        pinnedBg: "bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-100 dark:group-hover:bg-blue-900",
        name: "font-bold text-blue-900 dark:text-blue-100",
      }
    : {
        row: "group border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
        pinnedBg: "bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800",
        name: "font-medium text-black dark:text-white",
      };
}
