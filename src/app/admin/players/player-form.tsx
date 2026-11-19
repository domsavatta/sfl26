"use client";

import { startTransition, useActionState, useState } from "react";
import type { PlayerFormState } from "@/app/actions/admin-players";
import type { PlayerInput } from "@/models/admin-players";

const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/** Add or edit a player; fields keep what was typed if a save is rejected. */
export default function PlayerForm({
  action,
  initial,
  seasonName,
  isSelf = false,
  submitLabel,
  children,
}: {
  action: (state: PlayerFormState, formData: FormData) => Promise<PlayerFormState>;
  initial: PlayerInput;
  seasonName: string | null;
  isSelf?: boolean; // the admin editing their own player
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [player, setPlayer] = useState(initial);
  const set = <K extends keyof PlayerInput>(key: K, value: PlayerInput[K]) =>
    setPlayer((p) => ({ ...p, [key]: value }));

  const field = (
    key: "name" | "firstName" | "lastName" | "email",
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={key} className={labelClass}>
        {label}
      </label>
      <input
        id={key}
        name={key}
        value={player[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        className={inputClass}
        {...props}
      />
    </div>
  );

  const checkbox = (
    key: "inSeason" | "admin" | "hidden",
    label: string,
    hint: string,
    disabled = false,
  ) => (
    <label className={`flex items-start gap-2.5 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        name={key}
        checked={player[key]}
        disabled={disabled}
        onChange={(e) => set(key, e.target.checked)}
        className="mt-1 size-4 accent-blue-600"
      />
      <span>
        <span className="block text-sm font-medium text-black dark:text-white">{label}</span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
      </span>
    </label>
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      <div>
        {field("name", "Name", { required: true, maxLength: 50, autoCapitalize: "words", autoComplete: "off" })}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Shown on the site, and what they sign in with.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("firstName", "First name", { maxLength: 250, autoComplete: "off" })}
        {field("lastName", "Last name", { maxLength: 250, autoComplete: "off" })}
      </div>
      {field("email", "Email", { type: "email", maxLength: 250, autoComplete: "off" })}
      <div>
        <label htmlFor="profile" className={labelClass}>
          Profile <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="profile"
          name="profile"
          rows={3}
          maxLength={4000}
          value={player.profile ?? ""}
          onChange={(e) => set("profile", e.target.value)}
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Access</legend>
        {checkbox(
          "inSeason",
          seasonName ? `Playing in the ${seasonName}` : "Playing in the current season",
          "Can make picks and appears in this season's standings.",
          !seasonName,
        )}
        {checkbox(
          "admin",
          "Admin",
          isSelf ? "You can't remove your own admin role." : "Can use these admin pages.",
          isSelf && player.admin,
        )}
        {/* A disabled checkbox isn't submitted: keep your own admin role. */}
        {isSelf && player.admin && <input type="hidden" name="admin" value="on" />}
        {checkbox(
          "hidden",
          "Hidden",
          isSelf ? "You can't hide yourself." : "Can't sign in, and doesn't appear in picks or standings.",
          isSelf && !player.hidden,
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {children}
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
