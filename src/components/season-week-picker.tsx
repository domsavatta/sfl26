"use client";

import Form from "next/form";

const selectClass =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-base sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

type Season = {
  seasonId: number;
  seasonName: string;
  weeks: { weekId: number; weekName: string }[]; // oldest first
};

/**
 * Season + week picker. A GET form, so the selection lives in the URL
 * (e.g. /standings?season=26&week=2611) and is shareable; it submits on
 * change. Changing the season clears the week, so the page shows that
 * season's default.
 */
export default function SeasonWeekPicker({
  action,
  seasons,
  seasonId,
  weekId,
  weekLabel = "Week",
  allWeeksLabel,
}: {
  /** Page path the form submits to, e.g. "/standings". */
  action: string;
  seasons: Season[];
  seasonId: number;
  weekId: number | null;
  /** Label above the week select. */
  weekLabel?: string;
  /** If set, the week select starts with this "no week" option (e.g. "Overall"). */
  allWeeksLabel?: string;
}) {
  const season = seasons.find((s) => s.seasonId === seasonId);
  const weeksNewestFirst = [...(season?.weeks ?? [])].reverse();

  return (
    // key: re-mount when the URL changes so the selects show the new values.
    <Form
      key={`${seasonId}-${weekId}`}
      action={action}
      scroll={false}
      className="grid grid-cols-2 gap-3 sm:flex sm:gap-3"
    >
      <label className="block">
        <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Season
        </span>
        <select
          name="season"
          defaultValue={seasonId}
          className={selectClass}
          onChange={(e) => {
            // A week from the old season doesn't exist in the new one.
            const form = e.currentTarget.form!;
            (form.elements.namedItem("week") as HTMLSelectElement).value = "";
            form.requestSubmit();
          }}
        >
          {seasons.map((s) => (
            <option key={s.seasonId} value={s.seasonId}>
              {s.seasonName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          {weekLabel}
        </span>
        <select
          name="week"
          defaultValue={weekId ?? ""}
          className={selectClass}
          onChange={(e) => e.currentTarget.form!.requestSubmit()}
        >
          {allWeeksLabel !== undefined && (
            <option value="">{allWeeksLabel}</option>
          )}
          {weeksNewestFirst.map((w) => (
            <option key={w.weekId} value={w.weekId}>
              {w.weekName}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button
          type="submit"
          className="mt-5 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          Show
        </button>
      </noscript>
    </Form>
  );
}
