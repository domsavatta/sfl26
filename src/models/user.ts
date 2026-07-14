import { validate, hash } from '@/lib/asp-dot-net-password';
import { query } from 'db';



export async function signInUser(username: string, password: string) {
  // Fetch the user from the database by name
  const sql = (playerName: string) => `select 
  p.playerId, 
  name playerName,
  email,
  password,
  isnull(r.RoleId, 0) isAdmin,
  iif(ps.seasonID > 20, 1, 0) isActivePlayer
  from Player p
  join webpages_Membership m
  on m.UserId = p.PlayerId
  left join webpages_UsersInRoles r
  on r.UserId = p.PlayerId and r.RoleId = 1
  left join playersSeason ps
  on ps.PlayerId = p.PlayerId and ps.SeasonID = (select SeasonID from season where isCurrent = 1)
  where 1=1
  and p.name = '${playerName}'
  and p.PNG = 0`;

  const data = await query(sql(username));

  const userData = data.recordsets[0][0] as any;

  if (validate(password, userData.password)) {
    return {
      playerName: userData.playerName,
      playerId: userData.playerId,
      isAdmin: !!userData.isAdmin,
      isActivePlayer: !!userData.isActivePlayer,
    } as unknown as any;
  }
  return null;

}
