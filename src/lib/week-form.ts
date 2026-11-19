import type { WeekInput } from "@/models/admin-weeks";

const MAX_NAME_LENGTH = 50; // Week.Name is varchar(50)
const MAX_SORT = 999;

/** The default name for week `n`, matching existing names ("Week 01"). */
export const defaultWeekName = (n: number) =>
  `Week ${String(n).padStart(2, "0")}`;

/** Reads the add/edit week form: weekName, sort, live, official. */
export function parseWeekForm(
  formData: FormData,
): { week: WeekInput } | { error: string } {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };

  const weekName = text("weekName");
  if (!weekName) return { error: "Enter a week name." };
  if (weekName.length > MAX_NAME_LENGTH) {
    return { error: `The week name must be at most ${MAX_NAME_LENGTH} characters.` };
  }

  const sortText = text("sort");
  const sort = Number(sortText);
  if (!sortText || !Number.isInteger(sort) || sort < 1 || sort > MAX_SORT) {
    return { error: `The order must be a whole number from 1 to ${MAX_SORT}.` };
  }

  return {
    week: {
      weekName,
      sort,
      live: formData.get("live") === "on",
      official: formData.get("official") === "on",
    },
  };
}
