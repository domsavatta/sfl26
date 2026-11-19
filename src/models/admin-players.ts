/**
 * Admin: players.
 *
 * - Player names are unique: players sign in by name.
 * - "In the current season" is a PlayersSeason row. A player with picks this
 *   season can't be removed from it.
 * - Admin is webpages_UsersInRoles role 1.
 * - Hidden is Player.PNG: hidden players can't sign in and don't appear in
 *   picks or standings.
 * - Passwords are only ever set to the default password (the current
 *   season's Season.defaultPassword, see default-password.ts),
 *   on new players and on reset; players change it on their Account page.
 * - An admin can't remove their own admin role or hide themselves.
 */
import { hash } from '@/lib/asp-dot-net-password';
import { query } from 'db';

export type AdminPlayerRow = {
  playerId: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  hidden: boolean;
  inSeason: boolean;
  admin: boolean;
};

export type AdminPlayerDetail = AdminPlayerRow & {
  profile: string | null;
  seasonPicks: number; // picks in the current season
  totalPicks: number; // picks in any season
  inStandings: boolean; // has weekly or season standings rows
  hasLogin: boolean;
};

export type PlayerInput = {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profile: string | null;
  hidden: boolean;
  inSeason: boolean;
  admin: boolean;
};

export type PlayerProblem =
  | 'not-found'
  | 'no-season'
  | 'duplicate-name'
  | 'has-picks'
  | 'in-standings'
  | 'self';

export type SavePlayerResult =
  | { ok: true; playerId: number }
  | { ok: false; problem: PlayerProblem };

const SEASON = `declare @seasonId int = (
    select top 1 SeasonID from Season where IsCurrent = 1 order by Sort desc);`;

const PLAYER_COLUMNS = `p.PlayerId playerId, p.Name name,
  nullif(p.FirstName, '') firstName, nullif(p.LastName, '') lastName,
  nullif(p.Email, '') email, p.PNG hidden,
  cast(iif(exists (select 1 from PlayersSeason ps
    where ps.PlayerId = p.PlayerId and ps.SeasonID = @seasonId), 1, 0) as bit) inSeason,
  cast(iif(exists (select 1 from webpages_UsersInRoles r
    where r.UserId = p.PlayerId and r.RoleId = 1), 1, 0) as bit) admin`;

/** The current season's name, or null. */
export async function getCurrentSeasonName(): Promise<string | null> {
  const result = await query<{ name: string }>(
    `select top 1 Name name from Season where IsCurrent = 1 order by Sort desc`,
  );
  return result.recordset[0]?.name ?? null;
}

/** Every player, current season first, then by name. */
export async function getPlayers(): Promise<AdminPlayerRow[]> {
  const result = await query<AdminPlayerRow>(
    `${SEASON}
     select ${PLAYER_COLUMNS} from Player p
     order by inSeason desc, p.Name`,
  );
  return result.recordset;
}

export async function getPlayer(playerId: number): Promise<AdminPlayerDetail | null> {
  const result = await query<AdminPlayerDetail>(
    `${SEASON}
     select ${PLAYER_COLUMNS},
       cast(p.Profile as nvarchar(max)) profile,
       (select count(*) from Pick pk join Game g on g.GameID = pk.GameID
        join Week w on w.WeekID = g.WeekID
        where pk.PlayerId = p.PlayerId and w.SeasonID = @seasonId) seasonPicks,
       (select count(*) from Pick pk where pk.PlayerId = p.PlayerId) totalPicks,
       cast(iif(exists (select 1 from WeekStanding ws where ws.PlayerId = p.PlayerId)
         or exists (select 1 from SeasonStanding ss where ss.PlayerId = p.PlayerId), 1, 0) as bit) inStandings,
       cast(iif(exists (select 1 from webpages_Membership m
         where m.UserId = p.PlayerId), 1, 0) as bit) hasLogin
     from Player p where p.PlayerId = @playerId`,
    { playerId },
  );
  return result.recordset[0] ?? null;
}

/**
 * Sets season membership and admin to match @inSeason / @admin; needs
 * @playerId. The admin role needs a login (webpages_Membership) row; every
 * player made here has one, and a player without one can't sign in anyway.
 */
const SYNC_ROLES = `
  declare @hasLogin bit = iif(exists (select 1 from webpages_Membership where UserId = @playerId), 1, 0);
  if @inSeason = 1
  begin
    if not exists (select 1 from PlayersSeason where PlayerId = @playerId and SeasonID = @seasonId)
      insert into PlayersSeason (SeasonID, PlayerId) values (@seasonId, @playerId);
  end
  else
    delete from PlayersSeason where PlayerId = @playerId and SeasonID = @seasonId;
  if @admin = 1
  begin
    if @hasLogin = 1 and not exists (select 1 from webpages_UsersInRoles where UserId = @playerId and RoleId = 1)
      insert into webpages_UsersInRoles (UserId, RoleId) values (@playerId, 1);
  end
  else
    delete from webpages_UsersInRoles where UserId = @playerId and RoleId = 1;`;

const params = (player: PlayerInput) => ({
  name: player.name,
  firstName: player.firstName,
  lastName: player.lastName,
  email: player.email,
  profile: player.profile,
  hidden: player.hidden,
  inSeason: player.inSeason,
  admin: player.admin,
});

type Row = { problem: PlayerProblem | null; playerId: number | null };
const toResult = (row: Row): SavePlayerResult =>
  row.problem || !row.playerId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, playerId: row.playerId };

/** Adds a player who can sign in with `defaultPassword`. */
export async function createPlayer(
  player: PlayerInput,
  defaultPassword: string,
): Promise<SavePlayerResult> {
  const result = await query<Row>(
    `set xact_abort on;
     ${SEASON}
     begin transaction;
     declare @playerId int = null;
     declare @problem varchar(20) = case
       when @inSeason = 1 and @seasonId is null then 'no-season'
       when exists (select 1 from Player with (updlock, holdlock) where Name = @name)
         then 'duplicate-name'
     end;
     if @problem is null
     begin
       insert into Player (Name, FirstName, LastName, Email, Profile, Active, PNG)
       values (@name, @firstName, @lastName, @email, @profile, 1, @hidden);
       set @playerId = scope_identity();
       insert into webpages_Membership (UserId, CreateDate, IsConfirmed,
         PasswordFailuresSinceLastSuccess, Password, PasswordChangedDate, PasswordSalt)
       values (@playerId, getutcdate(), 1, 0, @password, getutcdate(), '');
       ${SYNC_ROLES}
     end
     commit;
     select @problem problem, @playerId playerId;`,
    { ...params(player), password: hash(defaultPassword) },
  );
  return toResult(result.recordset[0]);
}

/** Updates a player; `adminId` is the admin making the change. */
export async function updatePlayer(
  playerId: number,
  player: PlayerInput,
  adminId: number,
): Promise<SavePlayerResult> {
  const result = await query<Row>(
    `set xact_abort on;
     ${SEASON}
     begin transaction;
     declare @problem varchar(20) = case
       when not exists (select 1 from Player with (updlock, holdlock) where PlayerId = @playerId)
         then 'not-found'
       when @inSeason = 1 and @seasonId is null then 'no-season'
       when exists (select 1 from Player where Name = @name and PlayerId <> @playerId)
         then 'duplicate-name'
       when @playerId = @adminId and (@admin = 0 or @hidden = 1) then 'self'
       when @inSeason = 0 and exists (select 1 from Pick pk
         join Game g on g.GameID = pk.GameID join Week w on w.WeekID = g.WeekID
         where pk.PlayerId = @playerId and w.SeasonID = @seasonId) then 'has-picks'
     end;
     if @problem is null
     begin
       update Player set Name = @name, FirstName = @firstName, LastName = @lastName,
         Email = @email, Profile = @profile, PNG = @hidden
       where PlayerId = @playerId;
       ${SYNC_ROLES}
     end
     commit;
     select @problem problem, iif(@problem is null, @playerId, null) playerId;`,
    { ...params(player), playerId, adminId },
  );
  return toResult(result.recordset[0]);
}

/** Sets the player's password to `defaultPassword` (creating their login if needed). */
export async function resetPassword(
  playerId: number,
  defaultPassword: string,
): Promise<SavePlayerResult> {
  const result = await query<Row>(
    `declare @problem varchar(20) =
       iif(exists (select 1 from Player where PlayerId = @playerId), null, 'not-found');
     if @problem is null
     begin
       if exists (select 1 from webpages_Membership where UserId = @playerId)
         update webpages_Membership set Password = @password, PasswordSalt = '',
           PasswordChangedDate = getutcdate(), PasswordFailuresSinceLastSuccess = 0
         where UserId = @playerId;
       else
         insert into webpages_Membership (UserId, CreateDate, IsConfirmed,
           PasswordFailuresSinceLastSuccess, Password, PasswordChangedDate, PasswordSalt)
         values (@playerId, getutcdate(), 1, 0, @password, getutcdate(), '');
     end
     select @problem problem, iif(@problem is null, @playerId, null) playerId;`,
    { playerId, password: hash(defaultPassword) },
  );
  return toResult(result.recordset[0]);
}

/**
 * Deletes a player who has no picks and no standings (in any season), with
 * their season entries, roles and login. `adminId` is the admin deleting;
 * admins can't delete themselves.
 */
export async function deletePlayer(
  playerId: number,
  adminId: number,
): Promise<SavePlayerResult> {
  const result = await query<Row>(
    `set xact_abort on;
     begin transaction;
     declare @problem varchar(20) = case
       when not exists (select 1 from Player with (updlock, holdlock) where PlayerId = @playerId)
         then 'not-found'
       when @playerId = @adminId then 'self'
       when exists (select 1 from Pick with (updlock, holdlock) where PlayerId = @playerId)
         then 'has-picks'
       when exists (select 1 from WeekStanding where PlayerId = @playerId)
         or exists (select 1 from SeasonStanding where PlayerId = @playerId)
         then 'in-standings'
     end;
     if @problem is null
     begin
       delete from webpages_UsersInRoles where UserId = @playerId;
       delete from webpages_OAuthMembership where UserId = @playerId;
       delete from webpages_Membership where UserId = @playerId;
       delete from PlayersSeason where PlayerId = @playerId;
       delete from Player where PlayerId = @playerId;
     end
     commit;
     select @problem problem, iif(@problem is null, @playerId, null) playerId;`,
    { playerId, adminId },
  );
  return toResult(result.recordset[0]);
}
