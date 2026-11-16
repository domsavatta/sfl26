import { validate } from '@/lib/asp-dot-net-password';
import type { PlayerSession } from '@/interfaces';
import { query } from 'db';

const signInSql = `select
  p.playerId,
  name playerName,
  email,
  password,
  cast(iif(r.RoleId is null, 0, 1) as bit) isAdmin,
  cast(iif(ps.seasonID > 20, 1, 0) as bit) isActivePlayer
  from Player p
  join webpages_Membership m
  on m.UserId = p.PlayerId
  left join webpages_UsersInRoles r
  on r.UserId = p.PlayerId and r.RoleId = 1
  left join playersSeason ps
  on ps.PlayerId = p.PlayerId and ps.SeasonID = (select SeasonID from season where isCurrent = 1)
  where 1=1
  and p.name = @playerName
  and p.PNG = 0`;

interface SignInRow {
  playerId: number;
  playerName: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isActivePlayer: boolean;
}

export async function signInUser(
  username: string,
  password: string,
): Promise<PlayerSession | null> {
  const data = await query<SignInRow>(signInSql, { playerName: username });
  const userData = data.recordsets[0]?.[0];

  // Unknown player name: fail the same way as a wrong password.
  if (!userData || !validate(password, userData.password)) {
    return null;
  }

  return {
    playerName: userData.playerName,
    playerId: userData.playerId,
    isAdmin: userData.isAdmin,
    isActivePlayer: userData.isActivePlayer,
  };
}
