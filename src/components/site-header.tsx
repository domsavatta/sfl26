"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/actions/auth";
import type { Player } from "@/interfaces";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/make-picks", label: "Make Picks" },
  { href: "/view-picks", label: "View Picks" },
  { href: "/standings", label: "Standings" },
];

const buttonClass =
  "whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors";

export default function SiteHeader({ player }: { player: Player | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
      {/* Below lg: title + account on the first row, nav on the second.
          lg and up: title | nav | account on one row. */}
      <div className="max-w-6xl mx-auto px-4 pt-4 lg:py-4 flex flex-wrap lg:flex-nowrap items-center gap-x-4 lg:gap-x-6">
        <Link
          href="/"
          className="order-1 text-2xl sm:text-3xl font-bold text-black dark:text-white whitespace-nowrap"
        >
          Sports Fans League
        </Link>

        <div className="order-2 lg:order-3 ml-auto lg:ml-0 flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3 min-w-0">
          {player ? (
            <>
              <span className="max-w-[8rem] sm:max-w-[12rem] truncate text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Hello {player.playerName}
              </span>
              <form action={signout}>
                <button type="submit" className={buttonClass}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className={buttonClass}>
              Sign in
            </Link>
          )}
        </div>

        <nav
          aria-label="Main"
          className="order-3 lg:order-2 w-full lg:w-auto lg:ml-auto overflow-x-auto"
        >
          <ul className="flex gap-1 py-2 lg:py-0">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-md px-2.5 sm:px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
