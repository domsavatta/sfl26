import { query } from "db";

/**
 * The password new players get and reset passwords are set to: the current
 * season's Season.defaultPassword (the current season is the newest, by
 * Sort, with IsCurrent = 1). Null when it isn't set (blank, or the
 * column's default text 'NULL'): then adding players
 * and resetting passwords are unavailable, rather than falling back to a
 * random password nobody knows.
 * Server code only: never pass the value to the browser.
 */
export async function getDefaultPassword(): Promise<string | null> {
  const result = await query<{ password: string | null }>(
    // 'NULL' is the column's default text, which isn't a real password.
    `select top 1 nullif(nullif(defaultPassword, ''), 'NULL') password
     from Season where IsCurrent = 1 order by Sort desc`,
  );
  return result.recordset[0]?.password ?? null;
}
