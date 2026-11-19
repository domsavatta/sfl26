import type { SeasonInput } from "@/models/admin-seasons";

const MAX_NAME = 50; // Season.Name is varchar(50)
const MAX_PASSWORD = 10; // Season.defaultPassword is varchar(10)

/** Reads the add season form: name, defaultPassword, makeCurrent. */
export function parseSeasonForm(formData: FormData): { season: SeasonInput } | { error: string } {
  const raw = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const name = raw("name").trim().replace(/\s+/g, " ");
  if (!name) return { error: "Enter the season's name." };
  if (name.length > MAX_NAME) return { error: `The name must be at most ${MAX_NAME} characters.` };

  // Passwords are used exactly as typed (spaces included).
  const defaultPassword = raw("defaultPassword");
  if (!defaultPassword.trim()) return { error: "Enter a default password for the season." };
  if (defaultPassword.length > MAX_PASSWORD) {
    return { error: `The default password must be at most ${MAX_PASSWORD} characters.` };
  }
  if (defaultPassword.trim().toUpperCase() === "NULL") {
    return { error: "Choose a different default password." };
  }

  return {
    season: {
      name,
      defaultPassword,
      makeCurrent: formData.get("makeCurrent") === "on",
    },
  };
}

/** The usual name for the season after `latestName` ("2023 Season" -> "2024 Season"). */
export function nextSeasonName(latestName: string | undefined, fallbackYear: number) {
  const year = latestName && /^(\d{4})\b/.exec(latestName)?.[1];
  return `${year ? Number(year) + 1 : fallbackYear} Season`;
}
