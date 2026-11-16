"use client";

import { signin } from "../actions/auth";
import { useActionState, useEffect, useRef } from "react";

export default function SignIn() {
  const [state, formAction, isPending] = useActionState(signin, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      // Trigger side-effects here (e.g., alert, toast notification)
      alert(state.message);
      // Manually reset form elements if using controlled/hybrid states
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex-1">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
          Sign In
        </h2>
        <form
          className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md"
          ref={formRef}
          action={formAction}
        >
          <input type="hidden" name="action" value="signin" />
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-black dark:text-white mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400"
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
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            Sign In
          </button>
        </form>
      </main>
    </div>
  );
}
