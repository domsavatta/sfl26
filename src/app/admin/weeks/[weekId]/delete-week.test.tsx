// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import DeleteWeek from "./delete-week";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete Week 17" }));
  });
};

describe("DeleteWeek", () => {
  test("cancelling the confirmation doesn't delete", async () => {
    const action = vi.fn(async () => null);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteWeek action={action} weekName="Week 17" games={0} />);

    await submit();

    expect(window.confirm).toHaveBeenCalledWith("Delete Week 17? This can't be undone.");
    expect(action).not.toHaveBeenCalled();
  });

  test("confirming deletes, and shows a refusal from the server", async () => {
    const action = vi.fn(async () => ({
      ok: false,
      message: "This week has games, so it can't be deleted.",
    }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DeleteWeek action={action} weekName="Week 17" games={0} />);

    await submit();

    expect(action).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toMatch(/has games/);
  });

  test("a week with games has no delete button", () => {
    render(<DeleteWeek action={vi.fn()} weekName="Week 16" games={2} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/has 2 games/)).toBeTruthy();
  });
});
