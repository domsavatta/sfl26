"use client";

import { useActionState } from "react";
import {
  updateEmail,
  updatePassword,
  type AccountFormState,
} from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/account-validation";

const sectionClass =
  "bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6";
const labelClass = "block text-sm font-medium text-black dark:text-white mb-1.5";
const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";
const buttonClass =
  "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60";

function Status({ state }: { state: AccountFormState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`text-sm ${
        state.ok
          ? "text-green-700 dark:text-green-400"
          : "text-red-700 dark:text-red-400"
      }`}
    >
      {state.message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={id} className={inputClass} required {...input} />
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

export function EmailForm({ email }: { email: string | null }) {
  const [state, formAction, isPending] = useActionState(updateEmail, null);
  return (
    <section className={sectionClass} aria-labelledby="email-heading">
      <h2 id="email-heading" className="text-lg font-semibold text-black dark:text-white">
        Email
      </h2>
      <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {email ? (
          <>
            Currently <span className="font-medium text-black dark:text-white">{email}</span>
          </>
        ) : (
          "You don't have an email address on file."
        )}
      </p>
      <form action={formAction} className="space-y-4">
        <Field
          id="email"
          label="New email"
          type="email"
          autoComplete="email"
          defaultValue={state?.ok ? "" : state?.email}
        />
        <Field
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving…" : "Update email"}
          </button>
          <Status state={state} />
        </div>
      </form>
    </section>
  );
}

export function PasswordForm({ playerName }: { playerName: string }) {
  const [state, formAction, isPending] = useActionState(updatePassword, null);
  return (
    <section className={sectionClass} aria-labelledby="password-heading">
      <h2 id="password-heading" className="mb-4 text-lg font-semibold text-black dark:text-white">
        Password
      </h2>
      <form action={formAction} className="space-y-4">
        {/* Lets password managers save the new password under this name. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={playerName}
          readOnly
          hidden
        />
        <Field
          id="currentPassword-pw"
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <Field
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <Field
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving…" : "Change password"}
          </button>
          <Status state={state} />
        </div>
      </form>
    </section>
  );
}
