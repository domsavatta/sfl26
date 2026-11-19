"use server";

import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { parseWeekForm } from "@/lib/week-form";
import {
  createWeek,
  deleteWeek,
  updateWeek,
  type SaveWeekResult,
} from "@/models/admin-weeks";

export type WeekFormState = { ok: boolean; message: string } | null;

const PROBLEMS: Record<Extract<SaveWeekResult, { ok: false }>["problem"], string> = {
  "no-season": "There's no current season.",
  "not-found": "That week isn't in the current season.",
  "duplicate-name": "Another week this season already has that name.",
  "duplicate-sort": "Another week this season already has that order.",
};

const NOT_ADMIN = { ok: false, message: "Only admins can change weeks." };

/** Adds a week, then shows it in the list. */
export async function addWeek(
  _: WeekFormState,
  formData: FormData,
): Promise<WeekFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseWeekForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result: SaveWeekResult;
  try {
    result = await createWeek(parsed.week);
  } catch (error) {
    console.error("createWeek failed", error);
    return { ok: false, message: "Couldn't add the week. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin?saved=${result.weekId}`);
}

/** Updates a week (weekId from the bound argument), then returns to the list. */
export async function editWeek(
  weekId: number,
  _: WeekFormState,
  formData: FormData,
): Promise<WeekFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseWeekForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  let result: SaveWeekResult;
  try {
    result = await updateWeek(weekId, parsed.week);
  } catch (error) {
    console.error("updateWeek failed", error);
    return { ok: false, message: "Couldn't save the week. Please try again." };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(`/admin?saved=${weekId}`);
}

/** Deletes a week with no games (weekId from the bound argument), then returns to the list. */
export async function removeWeek(
  weekId: number,
  _: WeekFormState,
): Promise<WeekFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can delete weeks." };

  let outcome;
  try {
    outcome = await deleteWeek(weekId);
  } catch (error) {
    console.error("deleteWeek failed", error);
    return { ok: false, message: "Couldn't delete the week. Please try again." };
  }
  if (outcome === "has-games") {
    return { ok: false, message: "This week has games, so it can't be deleted." };
  }
  if (outcome === "not-found") {
    return { ok: false, message: "That week isn't in the current season." };
  }
  redirect("/admin?deleted=1");
}
