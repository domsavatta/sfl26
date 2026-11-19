import Link from "next/link";

const SECTIONS = [
  { key: "seasons", href: "/admin/seasons", label: "Seasons" },
  { key: "weeks", href: "/admin", label: "Weeks" },
  { key: "teams", href: "/admin/teams", label: "Teams" },
  { key: "players", href: "/admin/players", label: "Players" },
] as const;

/** Switches between the admin sections. */
export default function AdminNav({ current }: { current: (typeof SECTIONS)[number]["key"] }) {
  return (
    <nav aria-label="Admin" className="flex gap-1">
      {SECTIONS.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          aria-current={s.key === current ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            s.key === current
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
