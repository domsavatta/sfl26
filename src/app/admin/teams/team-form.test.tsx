// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import TeamForm from "./team-form";

afterEach(cleanup);

const initial = { name: "Buffalo", league: "NFL" as const, abbreviation: null, active: true };

test("a locked league still submits, but can't be changed", () => {
  render(
    <TeamForm
      action={vi.fn()}
      initial={initial}
      leagues={["NFL", "College"]}
      leagueLocked="This team has games, so its league can't change."
      submitLabel="Save"
    />,
  );
  const form = screen.getByRole("button", { name: "Save" }).closest("form")!;
  expect(new FormData(form).get("league")).toBe("NFL");
  for (const radio of screen.getAllByRole("radio")) {
    expect((radio as HTMLInputElement).matches(":disabled")).toBe(true);
  }
});

test("an unlocked league is a normal choice", () => {
  render(<TeamForm action={vi.fn()} initial={initial} leagues={["NFL", "College"]} submitLabel="Save" />);
  const form = screen.getByRole("button", { name: "Save" }).closest("form")!;
  expect(new FormData(form).getAll("league")).toEqual(["NFL"]);
  expect(screen.getByRole("radio", { name: "College" }).matches(":disabled")).toBe(false);
});
