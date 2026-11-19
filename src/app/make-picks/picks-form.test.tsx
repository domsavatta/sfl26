// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { MakePicksGame, MakePicksWeek } from "@/models/make-picks";
import PicksForm from "./picks-form";

vi.mock("@/app/actions/picks", () => ({ submitPicks: vi.fn() }));

afterEach(cleanup);

let nextId = 1;
const game = (
  favorite: string,
  underdog: string,
  pick: Partial<Pick<MakePicksGame, "pickTeamId" | "isLock">> = {},
): MakePicksGame => {
  const gameId = nextId++;
  return {
    gameId,
    league: "NFL",
    favorite: { teamId: gameId * 10 + 1, name: favorite, score: null, location: "Home" },
    underdog: { teamId: gameId * 10 + 2, name: underdog, score: null, location: "Away" },
    spread: 3.5,
    gametime: new Date(Date.UTC(2026, 10, 29, 13)),
    storyline: null,
    status: null,
    official: false,
    tie: false,
    winnerId: null,
    started: false,
    pickTeamId: null,
    isLock: false,
    ...pick,
  };
};

function setup(weeks: MakePicksWeek[]) {
  render(<PicksForm weeks={weeks} />);
  return {
    week: (name: string) =>
      within(screen.getByRole("heading", { name }).closest("section")!),
  };
}

describe("PicksForm", () => {
  test("shows saved picks and how many are picked", () => {
    const bills = game("Bills", "Chiefs");
    const { week } = setup([
      {
        weekId: 1,
        weekName: "Week 15",
        startedLock: null,
        games: [{ ...bills, pickTeamId: bills.underdog.teamId }, game("Jets", "Giants")],
      },
    ]);
    expect(week("Week 15").getByText("1 of 2 picked")).toBeTruthy();
    expect(week("Week 15").getByRole<HTMLInputElement>("radio", { name: /Chiefs/ }).checked).toBe(true);
  });

  test("the lock is disabled until a team is picked", () => {
    const { week } = setup([
      { weekId: 1, weekName: "Week 15", startedLock: null, games: [game("Bills", "Chiefs")] },
    ]);
    const lock = week("Week 15").getByRole<HTMLInputElement>("radio", { name: /Lock/ });
    expect(lock.disabled).toBe(true);

    fireEvent.click(week("Week 15").getByRole("radio", { name: /Bills/ }));
    expect(lock.disabled).toBe(false);
    expect(week("Week 15").getByText("1 of 1 picked")).toBeTruthy();

    fireEvent.click(lock);
    expect(lock.checked).toBe(true);
  });

  test("one lock per week, and Clear lock removes it", () => {
    const a = game("Bills", "Chiefs");
    const b = game("Jets", "Giants");
    const { week } = setup([
      {
        weekId: 1,
        weekName: "Week 15",
        startedLock: null,
        games: [
          { ...a, pickTeamId: a.favorite.teamId, isLock: true },
          { ...b, pickTeamId: b.favorite.teamId },
        ],
      },
    ]);
    const [lockA, lockB] = week("Week 15").getAllByRole<HTMLInputElement>("radio", { name: /Lock/ });
    expect(lockA.checked).toBe(true);

    fireEvent.click(lockB);
    expect(lockA.checked).toBe(false);
    expect(lockB.checked).toBe(true);

    fireEvent.click(week("Week 15").getByRole("button", { name: "Clear lock" }));
    expect(lockA.checked).toBe(false);
    expect(lockB.checked).toBe(false);
    expect(week("Week 15").queryByRole("button", { name: "Clear lock" })).toBeNull();
  });

  test("a week whose lock has started shows it and has no lock options", () => {
    const { week } = setup([
      {
        weekId: 1,
        weekName: "Week 15",
        startedLock: { teamName: "Bills", opponentName: "Chiefs" },
        games: [game("Jets", "Giants")],
      },
      { weekId: 2, weekName: "Week 16", startedLock: null, games: [game("Bears", "Lions")] },
    ]);
    expect(week("Week 15").getByText(/can.t be changed/)).toBeTruthy();
    expect(week("Week 15").queryByRole("radio", { name: /Lock/ })).toBeNull();
    expect(week("Week 16").getByRole("radio", { name: /Lock/ })).toBeTruthy();
  });

  test("locks in different weeks are independent", () => {
    const a = game("Bills", "Chiefs");
    const b = game("Bears", "Lions");
    const { week } = setup([
      { weekId: 1, weekName: "Week 15", startedLock: null, games: [{ ...a, pickTeamId: a.favorite.teamId }] },
      { weekId: 2, weekName: "Week 16", startedLock: null, games: [{ ...b, pickTeamId: b.favorite.teamId }] },
    ]);
    const lock15 = week("Week 15").getByRole<HTMLInputElement>("radio", { name: /Lock/ });
    const lock16 = week("Week 16").getByRole<HTMLInputElement>("radio", { name: /Lock/ });
    fireEvent.click(lock15);
    fireEvent.click(lock16);
    expect(lock15.checked).toBe(true);
    expect(lock16.checked).toBe(true);
  });
});
