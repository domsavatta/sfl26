import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentPlayer } from "@/lib/session";
import { getAccount } from "@/models/account";
import { EmailForm, PasswordForm } from "./account-forms";

export const metadata: Metadata = {
  title: "Account | Sports Fans League",
};

export default async function AccountPage() {
  const player = await getCurrentPlayer();
  const account = player ? await getAccount(player.playerId) : null;

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
          Account
        </h1>
        {account && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {account.playerName}
          </p>
        )}
      </div>

      {account ? (
        <>
          <EmailForm email={account.email} />
          <PasswordForm playerName={account.playerName} />
        </>
      ) : (
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 text-zinc-600 dark:text-zinc-400">
          <Link
            href="/sign-in?next=%2Faccount"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>{" "}
          to change your email or password.
        </section>
      )}
    </main>
  );
}
