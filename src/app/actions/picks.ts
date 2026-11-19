"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/session";
import { parsePicksForm } from "@/lib/parse-picks";
import { savePicks } from "@/models/make-picks";

export type SavePicksState = {
  ok: boolean;
  message: string;
} | null;

/**
 * Saves the Make Picks form (fields: see parsePicksForm). The player always
 * comes from the signed session, never the form.
 */
export async function submitPicks(
  _: SavePicksState,
  formData: FormData,
): Promise<SavePicksState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to save your picks." };

  const parsed = parsePicksForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  try {
    const { saved, rejected } = await savePicks(session.playerId, parsed.picks);
    refresh();
    if (!saved)
      return {
        ok: false,
        message: "Nothing was saved. Those games may have already started.",
      };
    return {
      ok: true,
      message: rejected
        ? `Saved ${saved} ${saved === 1 ? "pick" : "picks"}. ${rejected} couldn't be saved because the game already started.`
        : `Saved ${saved} ${saved === 1 ? "pick" : "picks"}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error && /Only one lock per week/.test(error.message)
        ? "Only one lock per week."
        : "Couldn't save your picks. Please try again.";
    if (message !== "Only one lock per week.") console.error("savePicks failed", error);
    return { ok: false, message };
  }
}
