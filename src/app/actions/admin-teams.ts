"use server";

import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { parseTeamForm } from "@/lib/team-form";
import {
  createTeam,
  deleteTeam,
  updateTeam,
  type TeamProblem,
} from "@/models/admin-teams";

export type TeamFormState = { ok: boolean; message: string } | null;

const PROBLEMS: Record<TeamProblem, string> = {
  "not-found": "That team no longer exists.",
  duplicate: "There's already a team with that name in that league.",
  "league-locked": "This team has games, so its league can't be changed.",
  "has-games": "This team has games, so it can't be deleted. Make it inactive instead.",
};

const NOT_ADMIN = { ok: false, message: "Only admins can change teams." };

async function run(save: () => Promise<{ ok: true; teamId: number } | { ok: false; problem: TeamProblem }>, failure: string, done: (teamId: number) => string) {
  let result;
  try {
    result = await save();
  } catch (error) {
    console.error(failure, error);
    return { ok: false, message: `${failure}. Please try again.` };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(done(result.teamId));
}

export async function addTeam(_: TeamFormState, formData: FormData): Promise<TeamFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseTeamForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  return run(() => createTeam(parsed.team), "Couldn't add the team", (id) => `/admin/teams?saved=${id}`);
}

/** teamId is bound. */
export async function editTeam(
  teamId: number,
  _: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const parsed = parseTeamForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  return run(() => updateTeam(teamId, parsed.team), "Couldn't save the team", (id) => `/admin/teams?saved=${id}`);
}

/** teamId is bound. */
export async function removeTeam(teamId: number, _: TeamFormState): Promise<TeamFormState> {
  if (!(await getAdmin())) return { ok: false, message: "Only admins can delete teams." };
  return run(() => deleteTeam(teamId), "Couldn't delete the team", () => "/admin/teams?deleted=1");
}
