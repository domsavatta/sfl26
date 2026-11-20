"use server";

import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { getDefaultPassword } from "@/lib/default-password";
import { parsePlayerForm } from "@/lib/player-form";
import {
  createPlayer,
  deletePlayer,
  resetPassword,
  updatePlayer,
  type PlayerProblem,
  type SavePlayerResult,
} from "@/models/admin-players";

export type PlayerFormState = { ok: boolean; message: string } | null;

const PROBLEMS: Record<PlayerProblem, string> = {
  "not-found": "That player no longer exists.",
  "no-season": "There's no current season to add the player to.",
  "duplicate-name": "Another player already has that name. Players sign in by name, so it must be unique.",
  "has-picks": "This player has picks, so they can't be removed from this season or deleted.",
  "in-standings": "This player is in the standings, so they can't be deleted.",
  self: "You can't remove your own admin role, hide yourself or delete yourself.",
};

const NOT_ADMIN = { ok: false, message: "Only admins can change players." };
const NO_DEFAULT_PASSWORD = {
  ok: false,
  message: "There's no default password: set one for the current season on the admin Seasons page.",
};

async function run(
  save: () => Promise<SavePlayerResult>,
  failure: string,
  done: (playerId: number) => string,
): Promise<PlayerFormState> {
  let result;
  try {
    result = await save();
  } catch (error) {
    console.error(failure, error);
    return { ok: false, message: `${failure}. Please try again.` };
  }
  if (!result.ok) return { ok: false, message: PROBLEMS[result.problem] };
  redirect(done(result.playerId));
}

export async function addPlayer(_: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const password = await getDefaultPassword();
  if (!password) return NO_DEFAULT_PASSWORD;
  const parsed = parsePlayerForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  return run(
    () => createPlayer(parsed.player, password),
    "Couldn't add the player",
    (id) => `/admin/players/${id}?added=1`,
  );
}

/** playerId is bound. */
export async function editPlayer(
  playerId: number,
  _: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const admin = await getAdmin();
  if (!admin) return NOT_ADMIN;
  const parsed = parsePlayerForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  return run(
    () => updatePlayer(playerId, parsed.player, admin.playerId),
    "Couldn't save the player",
    (id) => `/admin/players?saved=${id}`,
  );
}

/** playerId is bound. */
export async function resetPlayerPassword(playerId: number, _: PlayerFormState): Promise<PlayerFormState> {
  if (!(await getAdmin())) return NOT_ADMIN;
  const password = await getDefaultPassword();
  if (!password) return NO_DEFAULT_PASSWORD;
  return run(
    () => resetPassword(playerId, password),
    "Couldn't reset the password",
    (id) => `/admin/players/${id}?reset=1`,
  );
}

/** playerId is bound. Only players with no picks and no standings. */
export async function removePlayer(playerId: number, _: PlayerFormState): Promise<PlayerFormState> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Only admins can delete players." };
  return run(
    () => deletePlayer(playerId, admin.playerId),
    "Couldn't delete the player",
    () => "/admin/players?deleted=1&view=all",
  );
}
