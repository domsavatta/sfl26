"use server";

import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { parseSeasonForm } from "@/lib/season-form";
import { createSeason, makeSeasonCurrent, type SeasonProblem } from "@/models/admin-seasons";

export type SeasonFormState = { ok: boolean; message: string } | null;

const PROBLEMS: Record<SeasonProblem, string> = {
  "not-found": "That season no longer exists.",
  "duplicate-name": "There's already a season with that name.",
};

export async function addSeason(_: SeasonFormState, formData: FormData): Promise<SeasonFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can add seasons." };
  const parsed = parseSeasonForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result;
  try {
    result = await createSeason(parsed.season);
  } catch (error) {
    console.error("createSeason failed", error);
    return { ok: false, message: "Couldn't add the season. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/seasons?added=${result.seasonId}`);
}

/** seasonId is bound. */
export async function setCurrentSeason(seasonId: number, _: SeasonFormState): Promise<SeasonFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can change the current season." };
  let result;
  try {
    result = await makeSeasonCurrent(seasonId);
  } catch (error) {
    console.error("makeSeasonCurrent failed", error);
    return { ok: false, message: "Couldn't change the current season. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin/seasons?current=${seasonId}`);
}
