/**
 * The signed-in player's own account: email (Player.Email) and password
 * (webpages_Membership.Password, shared with the old site; see
 * asp-dot-net-password.ts). Both changes need the current password.
 */
import { hash, validate } from '@/lib/asp-dot-net-password';
import { query } from 'db';

export type Account = { playerName: string; email: string | null };

export async function getAccount(playerId: number): Promise<Account | null> {
  const result = await query<Account>(
    `select Name playerName, nullif(Email, '') email
     from Player where PlayerId = @playerId`,
    { playerId },
  );
  return result.recordset[0] ?? null;
}

/** Whether `password` is the player's current password. */
async function checkPassword(playerId: number, password: string) {
  const result = await query<{ password: string }>(
    `select Password password from webpages_Membership where UserId = @playerId`,
    { playerId },
  );
  const stored = result.recordset[0]?.password;
  return !!stored && validate(password, stored);
}

export type AccountChangeResult = 'ok' | 'wrong-password';

export async function changeEmail(
  playerId: number,
  currentPassword: string,
  email: string,
): Promise<AccountChangeResult> {
  if (!(await checkPassword(playerId, currentPassword))) return 'wrong-password';
  await query(`update Player set Email = @email where PlayerId = @playerId`, {
    playerId,
    email,
  });
  return 'ok';
}

export async function changePassword(
  playerId: number,
  currentPassword: string,
  newPassword: string,
): Promise<AccountChangeResult> {
  if (!(await checkPassword(playerId, currentPassword))) return 'wrong-password';
  // SimpleMembership stores PasswordChangedDate in UTC.
  await query(
    `update webpages_Membership
     set Password = @password, PasswordSalt = '',
       PasswordChangedDate = getutcdate(), PasswordFailuresSinceLastSuccess = 0
     where UserId = @playerId`,
    { playerId, password: hash(newPassword) },
  );
  return 'ok';
}
