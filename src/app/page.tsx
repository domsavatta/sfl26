"use client";

export default function Home() {
  // Mock data for current games
  const currentGames = [
    {
      id: 1,
      homeTeam: "Thunder",
      awayTeam: "Hawks",
      homeScore: 118,
      awayScore: 112,
      status: "Final",
    },
    {
      id: 2,
      homeTeam: "Lakers",
      awayTeam: "Celtics",
      homeScore: null,
      awayScore: null,
      status: "7:30 PM",
    },
    {
      id: 3,
      homeTeam: "Warriors",
      awayTeam: "Mavericks",
      homeScore: null,
      awayScore: null,
      status: "10:00 PM",
    },
  ];

  // Mock data for overall standings
  const overallStandings = [
    { rank: 1, team: "Thunder", wins: 8, losses: 2, points: 1245 },
    { rank: 2, team: "Hawks", wins: 7, losses: 3, points: 1198 },
    { rank: 3, team: "Celtics", wins: 7, losses: 3, points: 1187 },
    { rank: 4, team: "Lakers", wins: 6, losses: 4, points: 1156 },
    { rank: 5, team: "Warriors", wins: 5, losses: 5, points: 1134 },
  ];

  // Mock data for current week's standings
  const weekStandings = [
    { rank: 1, team: "Hawks", wins: 2, losses: 0, points: 245 },
    { rank: 2, team: "Thunder", wins: 1, losses: 1, points: 198 },
    { rank: 3, team: "Lakers", wins: 1, losses: 1, points: 187 },
    { rank: 4, team: "Warriors", wins: 1, losses: 1, points: 156 },
    { rank: 5, team: "Celtics", wins: 0, losses: 2, points: 134 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            Sports Fans League
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Games */}
          <div className="lg:col-span-2">
            <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                Current Games
              </h2>
              <div className="space-y-4">
                {currentGames.map((game) => (
                  <div
                    key={game.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-black dark:text-white">
                            {game.homeTeam}
                          </span>
                          {game.homeScore !== null ? (
                            <span className="text-2xl font-bold text-black dark:text-white">
                              {game.homeScore}
                            </span>
                          ) : (
                            <span className="text-sm text-zinc-500">
                              {game.status}
                            </span>
                          )}
                        </div>
                        <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded mb-2"></div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-black dark:text-white">
                            {game.awayTeam}
                          </span>
                          {game.awayScore !== null ? (
                            <span className="text-2xl font-bold text-black dark:text-white">
                              {game.awayScore}
                            </span>
                          ) : (
                            <span className="text-sm text-zinc-500"></span>
                          )}
                        </div>
                      </div>
                    </div>
                    {game.homeScore !== null && (
                      <div className="text-xs text-zinc-500 text-right mt-2">
                        {game.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Overall Standings */}
            <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                Overall Standings
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Rank
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Team
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        W
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        L
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overallStandings.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <td className="py-3 px-2 text-black dark:text-white font-semibold">
                          {entry.rank}
                        </td>
                        <td className="py-3 px-2 text-black dark:text-white">
                          {entry.team}
                        </td>
                        <td className="text-center py-3 px-2 text-black dark:text-white">
                          {entry.wins}
                        </td>
                        <td className="text-center py-3 px-2 text-black dark:text-white">
                          {entry.losses}
                        </td>
                        <td className="text-right py-3 px-2 text-black dark:text-white font-bold">
                          {entry.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Current Week's Standings */}
          <div>
            <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 sticky top-24">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                This Week
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                        Team
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                        W
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                        L
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekStandings.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <td className="py-2 px-2 text-black dark:text-white text-sm font-medium">
                          {entry.team}
                        </td>
                        <td className="text-center py-2 px-2 text-black dark:text-white text-sm">
                          {entry.wins}
                        </td>
                        <td className="text-center py-2 px-2 text-black dark:text-white text-sm">
                          {entry.losses}
                        </td>
                        <td className="text-right py-2 px-2 text-black dark:text-white text-sm font-bold">
                          {entry.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
