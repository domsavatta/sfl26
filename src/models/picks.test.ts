import { describe, expect, test } from "vitest";
import { sortPlayers, type PicksPlayer } from "./picks";

const player = (
  playerName: string,
  overallRank: number | null,
  weekRank: number | null,
): PicksPlayer => ({
  playerId: 0,
  playerName,
  overallRank,
  weekRank,
  picks: {},
  pickMade: new Set(),
  wins: 0,
  losses: 0,
});

const players = [
  player("dave", 2, null),
  player("Carol", 1, 3),
  player("bob", null, 1),
  player("Alice", 2, 1),
];
const names = (list: PicksPlayer[]) => list.map((p) => p.playerName);

describe("sortPlayers", () => {
  test("overall rank; ties by name; unranked last", () => {
    expect(names(sortPlayers(players, "overall"))).toEqual([
      "Carol",
      "Alice",
      "dave",
      "bob",
    ]);
  });

  test("week rank; ties by name; unranked last", () => {
    expect(names(sortPlayers(players, "week"))).toEqual([
      "Alice",
      "bob",
      "Carol",
      "dave",
    ]);
  });

  test("name, ignoring case", () => {
    expect(names(sortPlayers(players, "name"))).toEqual([
      "Alice",
      "bob",
      "Carol",
      "dave",
    ]);
  });

  test("doesn't change the original list", () => {
    const before = names(players);
    sortPlayers(players, "name");
    expect(names(players)).toEqual(before);
  });
});
