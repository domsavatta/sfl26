import Link from "next/link";
import type { PlayerSession } from "@/interfaces";

/** Shown instead of an admin page to anyone who isn't an admin. */
export default function AdminOnly({
  session,
  next,
}: {
  session: PlayerSession | null;
  next: string;
}) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 text-zinc-600 dark:text-zinc-400">
      {session ? (
        "This page is for league admins."
      ) : (
        <>
          <Link
            href={`/sign-in?next=${encodeURIComponent(next)}`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>{" "}
          as an admin to see this page.
        </>
      )}
    </section>
  );
}
