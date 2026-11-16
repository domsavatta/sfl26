import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Picks | Sports Fans League",
};

export default function ViewPicks() {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-2">
          View Picks
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          See everyone's picks for the current week.
        </p>
      </section>
    </main>
  );
}
