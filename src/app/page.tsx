"use client";

import StandingsTable from "@/components/standings-table";

export default function Home() {
  // Mock data for current games, grouped by week
  const currentWeeks = [
    {
      weekId: 11,
      weekName: "Week 11",
      games: [
        {
          id: 1,
          favorite: {
            name: "Thunder",
            score: 118,
            location: "Home",
            picks: 10,
          },
          underdog: {
            name: "Hawks",
            score: 112,
            picks: 8,
            location: "Away",
          },
          spread: 4.5,
          gametime: "2026-11-15T19:00:00-05:00",
          storyline: "Thunder look to extend their home win streak to six.",
          final: true,
        },
        {
          id: 2,
          favorite: {
            name: "Celtics",
            score: null,
            location: "Neutral",
            picks: 12,
          },
          underdog: {
            name: "Lakers",
            score: null,
            location: "Neutral",
            picks: 10,
          },
          spread: 3,
          gametime: "2026-11-16T19:30:00-05:00",
          storyline:
            "A classic rivalry renewed with both teams near the top of the standings.",
          final: false,
        },
        {
          id: 3,
          favorite: {
            name: "Warriors",
            score: null,
            location: "Away",
            picks: 9,
          },
          underdog: {
            name: "Nets",
            score: null,
            location: "Home",
            picks: 7,
          },
          spread: 6.5,
          gametime: "2026-11-16T22:00:00-05:00",
          storyline:
            "Can the Mavericks slow down the league's top-scoring offense?",
          final: false,
        },
      ],
    },
  ];

  const formatGametime = (gametime: string) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).format(new Date(gametime));

  // Mock data for the current season's standings
  const seasonStandings = {
    seasonName: "2026 Season",
    standings: [
      {
        rank: 1,
        playerId: 1,
        playerName: "Alex",
        correctPicks: 82,
        incorrectPicks: 28,
        weeklyWins: 3,
        qualityPoints: 41,
        difficultyPoints: 37,
        gamesBehind: 0,
      },
      {
        rank: 2,
        playerId: 2,
        playerName: "Jordan",
        correctPicks: 79,
        incorrectPicks: 31,
        weeklyWins: 2,
        qualityPoints: 38,
        difficultyPoints: 40,
        gamesBehind: 3,
      },
      {
        rank: 3,
        playerId: 3,
        playerName: "Sam",
        correctPicks: 77,
        incorrectPicks: 33,
        weeklyWins: 2,
        qualityPoints: 36,
        difficultyPoints: 33,
        gamesBehind: 5,
      },
      {
        rank: 4,
        playerId: 4,
        playerName: "Taylor",
        correctPicks: 74,
        incorrectPicks: 36,
        weeklyWins: 1,
        qualityPoints: 35,
        difficultyPoints: 29,
        gamesBehind: 8,
      },
      {
        rank: 5,
        playerId: 5,
        playerName: "Casey",
        correctPicks: 70,
        incorrectPicks: 40,
        weeklyWins: 1,
        qualityPoints: 31,
        difficultyPoints: 30,
        gamesBehind: 12,
      },
    ],
  };

  const seasonColumns = [
    { key: "rank", label: "", title: "", align: "text-left" },
    { key: "playerName", label: "Player", title: "Player", align: "text-left" },
    {
      key: "correctPicks",
      label: "W",
      title: "Correct picks",
      align: "text-center",
    },
    {
      key: "incorrectPicks",
      label: "L",
      title: "Incorrect picks",
      align: "text-center",
    },
    {
      key: "weeklyWins",
      label: "WW",
      title: "Weekly wins",
      align: "text-center",
    },
    {
      key: "qualityPoints",
      label: "QP",
      title: "Quality points",
      align: "text-center",
    },
    {
      key: "difficultyPoints",
      label: "DP",
      title: "Difficulty points",
      align: "text-center",
    },
    {
      key: "gamesBehind",
      label: "GB",
      title: "Games behind",
      align: "text-right",
    },
  ] as const;

  // Mock data for current week's standings
  const weeklyStandings = [
    {
      weekId: 11,
      weekName: "Week 11",
      standings: [
        {
          rank: 1,
          playerId: 2,
          playerName: "Jordan",
          correctPicks: 3,
          incorrectPicks: 0,
          gameOfTheWeek: 1,
          qualityPoints: 4,
          difficultyPoints: 5,
          gamesBehind: 0,
        },
        {
          rank: 2,
          playerId: 1,
          playerName: "Alex",
          correctPicks: 2,
          incorrectPicks: 1,
          gameOfTheWeek: 1,
          qualityPoints: 3,
          difficultyPoints: 2,
          gamesBehind: 1,
        },
        {
          rank: 3,
          playerId: 3,
          playerName: "Sam",
          correctPicks: 2,
          incorrectPicks: 1,
          gameOfTheWeek: 0,
          qualityPoints: 2,
          difficultyPoints: 3,
          gamesBehind: 1,
        },
        {
          rank: 4,
          playerId: 5,
          playerName: "Casey",
          correctPicks: 1,
          incorrectPicks: 2,
          gameOfTheWeek: 1,
          qualityPoints: 1,
          difficultyPoints: 2,
          gamesBehind: 2,
        },
        {
          rank: 5,
          playerId: 4,
          playerName: "Taylor",
          correctPicks: 0,
          incorrectPicks: 3,
          gameOfTheWeek: 0,
          qualityPoints: 0,
          difficultyPoints: 0,
          gamesBehind: 3,
        },
      ],
    },
  ];

  const weekColumns = [
    { key: "rank", label: "", title: "", align: "text-left" },
    { key: "playerName", label: "Player", title: "Player", align: "text-left" },
    { key: "correctPicks", label: "W", title: "Wins", align: "text-center" },
    {
      key: "incorrectPicks",
      label: "L",
      title: "Losses",
      align: "text-center",
    },
    {
      key: "gameOfTheWeek",
      label: "Lock",
      title: "Lock (game of the week)",
      align: "text-center",
    },
    {
      key: "qualityPoints",
      label: "QP",
      title: "Quality points",
      align: "text-center",
    },
    {
      key: "difficultyPoints",
      label: "DP",
      title: "Difficulty points",
      align: "text-center",
    },
    {
      key: "gamesBehind",
      label: "GB",
      title: "Games behind",
      align: "text-right",
    },
  ] as const;

  return (
    <div className="flex-1">
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Current Games */}
          <div className="lg:col-span-2">
            <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-4 sm:mb-6">
                Current Games
              </h2>
              <div className="space-y-8">
                {currentWeeks.map((week) => (
                  <div key={week.weekId}>
                    <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      {week.weekName}
                    </h3>
                    <div className="space-y-4">
                      {week.games.map((game) => (
                        <div
                          key={game.id}
                          className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-zinc-500 mb-3">
                            <span>{formatGametime(game.gametime)}</span>
                            <span className="font-semibold">
                              {game.final
                                ? "Final"
                                : `Spread: ${game.favorite.name} -${game.spread}`}
                            </span>
                          </div>
                          {[
                            { team: game.favorite, line: `-${game.spread}` },
                            { team: game.underdog, line: `+${game.spread}` },
                          ].map(({ team, line }, i) => (
                            <div key={team.name}>
                              {i > 0 && (
                                <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded my-2"></div>
                              )}
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-black dark:text-white">
                                    {team.name}
                                  </span>
                                  <span className="ml-2 text-sm text-zinc-500">
                                    {line}
                                  </span>
                                  <div className="text-xs text-zinc-500">
                                    {team.location} · {team.picks}{" "}
                                    {team.picks === 1 ? "pick" : "picks"}
                                  </div>
                                </div>
                                {team.score !== null && (
                                  <span className="text-2xl font-bold text-black dark:text-white">
                                    {team.score}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3">
                            {game.storyline}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Season Standings */}
            <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-4 sm:mb-6">
                {seasonStandings.seasonName} Standings
              </h2>
              <StandingsTable
                columns={seasonColumns}
                rows={seasonStandings.standings}
              />
            </section>
          </div>

          {/* Weekly Standings */}
          <div className="space-y-8">
            {weeklyStandings.map((week) => (
              <section
                key={week.weekId}
                className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-4 sm:mb-6">
                  {week.weekName} Standings
                </h2>
                <StandingsTable columns={weekColumns} rows={week.standings} />
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
