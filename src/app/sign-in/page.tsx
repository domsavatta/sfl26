import type { Metadata } from "next";
import Link from "next/link";
import { signout } from "@/app/actions/auth";
import { safeRedirectPath } from "@/lib/redirect-path";
import { getCurrentPlayer } from "@/lib/session";
import SignInForm from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In | Sports Fans League",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next: nextParam } = await searchParams;
  // Where to go after signing in: the page the player came from, or home.
  const next = safeRedirectPath(
    Array.isArray(nextParam) ? nextParam[0] : nextParam,
  );
  const player = await getCurrentPlayer();

  return (
    <div className="flex-1">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
          {player ? "Signed In" : "Sign In"}
        </h2>
        {player ? (
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md">
            <p className="text-black dark:text-white">
              You&apos;re signed in as{" "}
              <strong className="font-semibold">{player.playerName}</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={next}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                {next === "/" ? "Go to home" : "Continue"}
              </Link>
              <Link
                href="/account"
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Account
              </Link>
              <form action={signout}>
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>
        ) : (
          <SignInForm next={next} />
        )}
      </main>
    </div>
  );
}
