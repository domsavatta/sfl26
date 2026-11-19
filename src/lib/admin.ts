import type { PlayerSession } from "@/interfaces";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/models/admin-weeks";

/**
 * The signed-in player if they're an admin, else null. The role is checked
 * in the database every time, so removing it takes effect immediately
 * (the session's isAdmin can be up to 7 days old).
 */
export async function getAdmin(): Promise<PlayerSession | null> {
  const session = await getSession();
  if (!session) return null;
  return (await isAdmin(session.playerId)) ? session : null;
}
