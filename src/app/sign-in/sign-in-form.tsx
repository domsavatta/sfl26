"use client";

import { useActionState } from "react";
import { signin } from "@/app/actions/auth";

const inputClass =
  "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400";

/** On success the server redirects to `next`; errors are shown here. */
export default function SignInForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signin, null);

  return (
    <form
      className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md"
      action={formAction}
    >
      <input type="hidden" name="next" value={next} />
      <div className="mb-4">
        <label htmlFor="name" className="block text-black dark:text-white mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          autoComplete="username"
          defaultValue={state?.name}
          className={inputClass}
          required
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="password"
          className="block text-black dark:text-white mb-2"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          className={inputClass}
          required
        />
      </div>
      {state?.message && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
