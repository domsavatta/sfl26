import { LEAGUES, type League, type TeamInput } from "@/models/admin-teams";

const MAX_NAME = 100; // Team.Name is varchar(100)
const MAX_ABBREVIATION = 20; // Team.Abv is nvarchar(20)

/** Reads the add/edit team form: name, league, abbreviation (optional), active. */
export function parseTeamForm(formData: FormData): { team: TeamInput } | { error: string } {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  };

  const name = text("name");
  if (!name) return { error: "Enter the team's name." };
  if (name.length > MAX_NAME) return { error: `The name must be at most ${MAX_NAME} characters.` };

  const league = text("league");
  if (!(LEAGUES as readonly string[]).includes(league)) {
    return { error: `Choose a league: ${LEAGUES.join(" or ")}.` };
  }

  const abbreviation = text("abbreviation");
  if (abbreviation.length > MAX_ABBREVIATION) {
    return { error: `The abbreviation must be at most ${MAX_ABBREVIATION} characters.` };
  }

  return {
    team: {
      name,
      league: league as League,
      abbreviation: abbreviation || null,
      active: formData.get("active") === "on",
    },
  };
}
