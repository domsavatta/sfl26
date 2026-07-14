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
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            Sports Fans League
          </h1>
        </div>
      </header>

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
