import { checkEmail } from "@/lib/account-validation";
import type { PlayerInput } from "@/models/admin-players";

const MAX_NAME = 50; // Player.Name is nvarchar(50)
const MAX_PART = 250; // FirstName / LastName / Email are nvarchar(250)
const MAX_PROFILE = 4000;

/**
 * Reads the add/edit player form: name (sign-in name), firstName, lastName,
 * email, profile (all optional but name), and the hidden / inSeason / admin
 * checkboxes.
 */
export function parsePlayerForm(formData: FormData): { player: PlayerInput } | { error: string } {
  const text = (name: string, collapse = true) => {
    const value = formData.get(name);
    if (typeof value !== "string") return "";
    return collapse ? value.trim().replace(/\s+/g, " ") : value.trim();
  };
  const checked = (name: string) => formData.get(name) === "on";

  const name = text("name");
  if (!name) return { error: "Enter the player's name. It's what they sign in with." };
  if (name.length > MAX_NAME) return { error: `The name must be at most ${MAX_NAME} characters.` };

  const firstName = text("firstName");
  const lastName = text("lastName");
  if (firstName.length > MAX_PART || lastName.length > MAX_PART) {
    return { error: `First and last names must be at most ${MAX_PART} characters.` };
  }

  const email = text("email");
  if (email) {
    const error = checkEmail(email);
    if (error) return { error };
  }

  const profile = text("profile", false);
  if (profile.length > MAX_PROFILE) {
    return { error: `The profile must be at most ${MAX_PROFILE} characters.` };
  }

  return {
    player: {
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      profile: profile || null,
      hidden: checked("hidden"),
      inSeason: checked("inSeason"),
      admin: checked("admin"),
    },
  };
}
