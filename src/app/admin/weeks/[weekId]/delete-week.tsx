"use client";

import type { WeekFormState } from "@/app/actions/admin-weeks";
import ConfirmDelete from "../../confirm-delete";

/** Deletes the week after a confirmation; only weeks with no games. */
export default function DeleteWeek({
  action,
  weekName,
  games,
}: {
  action: (state: WeekFormState) => Promise<WeekFormState>;
  weekName: string;
  games: number;
}) {
  return (
    <ConfirmDelete
      action={action}
      title="Delete week"
      itemName={weekName}
      blocked={
        games > 0
          ? `${weekName} has ${games} ${games === 1 ? "game" : "games"}, so it can't be deleted. Only weeks with no games can be deleted.`
          : null
      }
    />
  );
}
