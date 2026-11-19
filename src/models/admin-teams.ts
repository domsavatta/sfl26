/**
 * Admin: teams.
 *
 * Rules (enforced here, in SQL):
 * - a team's name is unique within its league (the same name can be in both
 *   leagues, e.g. "Arizona");
 * - a team's league can't change once it has games (games can't mix leagues);
 * - a team with games can't be deleted (make it inactive instead). Inactive
 *   teams aren't offered for new games.
 * Logo fields (ImageName, imageId, backgroundColor) aren't used by this site
 * and are left as they are.
 */
import { query } from 'db';

export const LEAGUES = ['NFL', 'College'] as const;
export type League = (typeof LEAGUES)[number];

export type AdminTeamRow = {
  teamId: number;
  name: string;
  league: string;
  abbreviation: string | null;
  active: boolean;
  games: number;
};

export type TeamInput = {
  name: string;
  league: League;
  abbreviation: string | null;
  active: boolean;
};

export type TeamProblem = 'not-found' | 'duplicate' | 'league-locked' | 'has-games';

export type SaveTeamResult =
  | { ok: true; teamId: number }
  | { ok: false; problem: TeamProblem };

const TEAM_COLUMNS = `t.TeamID teamId, t.Name name, t.League league,
  nullif(t.Abv, '') abbreviation, t.Active active,
  (select count(*) from Game g
   where t.TeamID in (g.FavoriteID, g.UnderdogID)) games`;

/** Every team, by league (NFL first) and name. */
export async function getAllTeams(): Promise<AdminTeamRow[]> {
  const result = await query<AdminTeamRow>(
    `select ${TEAM_COLUMNS} from Team t order by t.League desc, t.Name, t.TeamID`,
  );
  return result.recordset;
}

export async function getTeam(teamId: number): Promise<AdminTeamRow | null> {
  const result = await query<AdminTeamRow>(
    `select ${TEAM_COLUMNS} from Team t where t.TeamID = @teamId`,
    { teamId },
  );
  return result.recordset[0] ?? null;
}

const DUPLICATE = `exists (select 1 from Team
  where Name = @name and League = @league and (@teamId is null or TeamID <> @teamId))`;

/** Games that use the team (as favorite, underdog or winner); needs @teamId. */
const USED = `exists (select 1 from Game g
  where @teamId in (g.FavoriteID, g.UnderdogID, g.WinnerID))`;

const params = (team: TeamInput) => ({
  name: team.name,
  league: team.league,
  abbreviation: team.abbreviation,
  active: team.active,
});

type Row = { problem: TeamProblem | null; teamId: number | null };
const toResult = (row: Row): SaveTeamResult =>
  row.problem || !row.teamId
    ? { ok: false, problem: row.problem ?? 'not-found' }
    : { ok: true, teamId: row.teamId };

export async function createTeam(team: TeamInput): Promise<SaveTeamResult> {
  const result = await query<Row>(
    `declare @teamId int = null;
     declare @problem varchar(20) = iif(${DUPLICATE}, 'duplicate', null);
     if @problem is null
     begin
       insert into Team (Name, League, Abv, Active) values (@name, @league, @abbreviation, @active);
       set @teamId = scope_identity();
     end
     select @problem problem, @teamId teamId;`,
    params(team),
  );
  return toResult(result.recordset[0]);
}

export async function updateTeam(teamId: number, team: TeamInput): Promise<SaveTeamResult> {
  const result = await query<Row>(
    `set xact_abort on;
     begin transaction;
     declare @oldLeague varchar(20) =
       (select League from Team with (updlock, holdlock) where TeamID = @teamId);
     declare @problem varchar(20) = case
       when @oldLeague is null then 'not-found'
       when ${DUPLICATE} then 'duplicate'
       when @league <> @oldLeague and ${USED} then 'league-locked'
     end;
     if @problem is null
       update Team set Name = @name, League = @league, Abv = @abbreviation, Active = @active
       where TeamID = @teamId;
     commit;
     select @problem problem, iif(@problem is null, @teamId, null) teamId;`,
    { ...params(team), teamId },
  );
  return toResult(result.recordset[0]);
}

/** Deletes a team that has never been in a game. */
export async function deleteTeam(teamId: number): Promise<SaveTeamResult> {
  const result = await query<Row>(
    `set xact_abort on;
     begin transaction;
     declare @problem varchar(20) = case
       when not exists (select 1 from Team with (updlock, holdlock) where TeamID = @teamId)
         then 'not-found'
       when ${USED} then 'has-games'
     end;
     if @problem is null delete from Team where TeamID = @teamId;
     commit;
     select @problem problem, iif(@problem is null, @teamId, null) teamId;`,
    { teamId },
  );
  return toResult(result.recordset[0]);
}
