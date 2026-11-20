import type { SeasonEdit, SeasonInput } from "@/models/admin-seasons";

const MAX_NAME = 50; // Season.Name is varchar(50)
const MAX_PASSWORD = 10; // Season.defaultPassword is varchar(10)
const MAX_SORT = 1_000_000; // Season.Sort is an int; keep it to sensible values

/**
 * Why a default password can't be used, or null when it can. Passwords are
 * used exactly as typed (spaces included).
 */
function defaultPasswordError(password: string): string | null {
  if (!password.trim()) return "Enter a default password for the season.";
  if (password.length > MAX_PASSWORD) {
    return `The default password must be at most ${MAX_PASSWORD} characters.`;
  }
  // 'NULL' is the column's default text, which counts as no password.
  if (password.trim().toUpperCase() === "NULL") return "Choose a different default password.";
  return null;
}

/** Reads the add season form: name, defaultPassword, makeCurrent. */
export function parseSeasonForm(formData: FormData): { season: SeasonInput } | { error: string } {
  const raw = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const name = raw("name").trim().replace(/\s+/g, " ");
  if (!name) return { error: "Enter the season's name." };
  if (name.length > MAX_NAME) return { error: `The name must be at most ${MAX_NAME} characters.` };

  const defaultPassword = raw("defaultPassword");
  const passwordError = defaultPasswordError(defaultPassword);
  if (passwordError) return { error: passwordError };

  return {
    season: {
      name,
      defaultPassword,
      makeCurrent: formData.get("makeCurrent") === "on",
    },
  };
}

/**
 * Reads the edit season form: name, sort, and an optional new default
 * password (blank keeps the current one).
 */
export function parseEditSeasonForm(formData: FormData): { season: SeasonEdit } | { error: string } {
  const raw = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const nameError = (name: string) =>
    !name ? "Enter the season's name." : name.length > MAX_NAME ? `The name must be at most ${MAX_NAME} characters.` : null;
  const name = raw("name").trim().replace(/\s+/g, " ");
  const error = nameError(name);
  if (error) return { error };

  const sortText = raw("sort").trim();
  const sort = /^-?\d+$/.test(sortText) ? Number(sortText) : NaN;
  if (!Number.isSafeInteger(sort) || Math.abs(sort) > MAX_SORT) {
    return { error: "The sort order must be a whole number." };
  }

  // Blank means "keep the current password".
  const password = raw("defaultPassword");
  let defaultPassword: string | null = null;
  if (password !== "") {
    const passwordError = defaultPasswordError(password);
    if (passwordError) return { error: passwordError };
    defaultPassword = password;
  }

  return { season: { name, sort, defaultPassword } };
}

/** The usual name for the season after `latestName` ("2023 Season" -> "2024 Season"). */
export function nextSeasonName(latestName: string | undefined, fallbackYear: number) {
  const year = latestName && /^(\d{4})\b/.exec(latestName)?.[1];
  return `${year ? Number(year) + 1 : fallbackYear} Season`;
}
