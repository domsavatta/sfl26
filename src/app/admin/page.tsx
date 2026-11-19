import type { Metadata } from "next";
import Link from "next/link";
import { addWeek } from "@/app/actions/admin-weeks";
import ScrollX from "@/components/scroll-x";
import { getAdmin } from "@/lib/admin";
import { toInt } from "@/lib/format";
import { getSession } from "@/lib/session";
import { defaultWeekName } from "@/lib/week-form";
import { getSeasonWeeks, type AdminWeek } from "@/models/admin-weeks";
import AdminOnly from "./admin-message";
import AdminNav from "./admin-nav";
import WeekForm from "./week-form";

export const metadata: Metadata = {
  title: "Admin | Sports Fans League",
};

const sectionClass =
  "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6";

function Flag({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="font-semibold text-green-700 dark:text-green-400" aria-label={label}>
      ✓
    </span>
  ) : (
    <span className="text-zinc-400 dark:text-zinc-600" aria-label={`Not ${label.toLowerCase()}`}>
      —
    </span>
  );
}

/** Week names link to their edit page (no separate Edit column, so it fits a phone). */
function WeeksTable({ weeks, savedId }: { weeks: AdminWeek[]; savedId: number | null }) {
  return (
    <ScrollX>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="py-2 pr-2 font-medium">Week</th>
            {/* Usually the week number; hidden on phones to save room. */}
            <th className="hidden sm:table-cell py-2 px-2 font-medium text-right">Order</th>
            <th className="py-2 px-2 font-medium text-right">Games</th>
            <th className="py-2 px-2 font-medium text-center">Live</th>
            <th className="py-2 pl-2 font-medium text-center">Official</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr
              key={week.weekId}
              className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${
                week.weekId === savedId ? "bg-green-50 dark:bg-green-950/40" : ""
              }`}
            >
              <td className="py-2 pr-2 whitespace-nowrap">
                <Link
                  href={`/admin/weeks/${week.weekId}`}
                  title={`Edit ${week.weekName}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {week.weekName}
                </Link>
              </td>
              <td className="hidden sm:table-cell py-2 px-2 text-right tabular-nums">{week.sort}</td>
              <td className="py-2 px-2 text-right tabular-nums">{week.games}</td>
              <td className="py-2 px-2 text-center">
                <Flag on={week.live} label="Live" />
              </td>
              <td className="py-2 pl-2 text-center">
                <Flag on={week.official} label="Official" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdmin();
  const params = await searchParams;
  const savedId = toInt(params.saved);
  const deleted = params.deleted === "1";

  if (!admin) {
    return (
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Admin
        </h1>
        <AdminOnly session={await getSession()} next="/admin" />
      </main>
    );
  }

  const { season, weeks } = await getSeasonWeeks();
  const nextSort = Math.max(0, ...weeks.map((w) => w.sort)) + 1;
  const saved = weeks.find((w) => w.weekId === savedId);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Admin
        </h1>
        <AdminNav current="weeks" />
        {season && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Weeks in the {season.seasonName}
          </p>
        )}
      </div>

      {!season ? (
        <section className={sectionClass}>
          <p className="text-zinc-600 dark:text-zinc-400">
            There&apos;s no current season.
          </p>
        </section>
      ) : (
        <>
          <section className={sectionClass} aria-labelledby="weeks-heading">
            <h2 id="weeks-heading" className="mb-3 text-lg font-semibold text-black dark:text-white">
              Weeks
            </h2>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Select a week to edit it.
            </p>
            {(saved || deleted) && (
              <p role="status" className="mb-3 text-sm text-green-700 dark:text-green-400">
                {saved ? `Saved ${saved.weekName}.` : "Week deleted."}
              </p>
            )}
            {weeks.length ? (
              <WeeksTable weeks={weeks} savedId={savedId} />
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No weeks yet.
              </p>
            )}
          </section>

          <section className={sectionClass} aria-labelledby="add-week-heading">
            <h2 id="add-week-heading" className="mb-4 text-lg font-semibold text-black dark:text-white">
              Add a week
            </h2>
            {/* Keyed by the next order, so after adding a week the form
                starts over with the following week's defaults. */}
            <WeekForm
              key={nextSort}
              action={addWeek}
              idPrefix="add"
              submitLabel="Add week"
              initial={{
                weekName: defaultWeekName(nextSort),
                sort: nextSort,
                live: false,
                official: false,
              }}
            />
          </section>
        </>
      )}
    </main>
  );
}
