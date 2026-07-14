import { query } from 'db';
import type { Week, Game } from '@/interfaces';

const homepageQuery = `
  select
    (select 
      week.weekId,
      week.name weekName,
      sort as 'order',
      week.live,
      week.official,
      gameId,
      (
        SELECT 
          top 1
          teamId, 
          imageId,
          name as teamName,
          league
        FROM team favorite
        where favorite.TeamID = games.favoriteId
      FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER
      ) as favoriteStr,
      favoritePickCount,
      favoriteScore,
      (
        SELECT 
          top 1
          teamId, 
          imageId,
          name teamName,
          league
        FROM team underdog
        where underdog.TeamID = games.underdogId
        FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER
      ) as underdogStr,
      underdogPickCount,
      underdogScore,
      storyline,
      CONCAT(DATENAME(dw, gametime), ', ', DATENAME(month, gametime), ' ', DATEPART(d, gametime), ', ', DATEPART(yyyy, gametime)) as displayTime,
      FORMAT(gametime, 'h:mm tt') as kickoff,
      favoriteSite,
      spread,
      games.winnerId,
      games.Official official,
      difficultyPoints,
      qualityPoints,
      tie
      from week
      join game games
      on week.weekId = games.WeekID 
      join team favorite
      on games.FavoriteID = favorite.TeamID
      join team underdog
      on games.UnderdogID = underdog.TeamID
      where 1=1
      and week.WeekID in (select weekId 
      	from Week
      	join Season on Week.SeasonID = Season.SeasonID and Season.IsCurrent = 1
      	where week.Official = 0 and week.live = 1) order by gametime
      	FOR JSON AUTO, INCLUDE_NULL_VALUES
    ) as weeks
  
select name seasonName, (select 
	ss.rank [rank],
	player.playerId [playerId],
	player.name [playerName],
	ss.correctPicks [correctPicks],
	(ss.totalGames - ss.CorrectPicks) [incorrectPicks],
	ss.totalGames [totalGames],
	ss.weeklyWins [weeklyWins],
	ss.qualityPoints [qualityPoints],
	ss.difficultyPoints [difficultyPoints],
	ss.gamesBehind [gamesBehind]
	from player
	join playersSeason 
	on playersSeason.playerId = player.playerId
	join season 
	on season.SeasonID = playersSeason.SeasonID
	and season.iscurrent = 1
	left join seasonstanding ss
	on ss.PlayerId = player.PlayerId 
	and ss.league = 'O'
	and ss.SeasonID = season.SeasonID
	order by ss.rank
	FOR JSON PATH, INCLUDE_NULL_VALUES) as seasonStandings
  from season
  where season.IsCurrent = 1

select (select 
	week.weekId,
	week.name as weekName,
	(
    select 
		player.playerId,
		player.Name playerName,
		weeklyStanding.ranking as rank,
		weeklyStanding.correctPicks,
		(weeklyStanding.totalGames - weeklyStanding.CorrectPicks) incorrectPicks,
		weeklyStanding.totalGames,
		weeklyStanding.GOW as gameOfTheWeek,
		weeklyStanding.qualityPoints,
		weeklyStanding.difficultyPoints,
		weeklyStanding.gamesBehind
		from player
		join playersSeason 
		on playersSeason.playerId = player.playerId
		join season 
		on season.SeasonID = playersSeason.SeasonID
		and season.iscurrent = 1
		left join WeekStanding weeklyStanding
		on weeklyStanding.PlayerId = player.PlayerId
		and weeklyStanding.league = 'O'
		and weeklyStanding.weekID = week.weekID
    order by ranking
		FOR JSON PATH, INCLUDE_NULL_VALUES
	) as standings
	from week
	join season 
	on season.seasonID = week.seasonID
	and season.isCurrent = 1
	where 1=1
	and week.Official = 0 
	and week.live = 1
	FOR JSON AUTO, INCLUDE_NULL_VALUES) as weeklyStandings

`;
interface Result {
  weeks: string;
}

interface DBGame extends Game {
  favoriteStr: string,
  underdogStr: string,
}

interface DBWeek extends Week {
  games: DBGame[];
}

export async function CurrentGamesData() {
  const data = await query<Result>(homepageQuery);
  const dbWeeks = JSON.parse(data.recordsets[0][0].weeks) as DBWeek[];

  const weeks = dbWeeks.map((w: DBWeek) => {
    const games = w.games.map((g: DBGame) => {
      try {
        const game = {
          ...g,
          underdog: {
            ...JSON.parse(g.underdogStr),
            pickCount: g.underdogPickCount,
            score: g.underdogScore,
          },
          favorite: {
            ...JSON.parse(g.favoriteStr),
            pickCount: g.favoritePickCount,
            score: g.favoriteScore,
          },
          underdogStr: undefined,
          favoriteStr: undefined,
        } as unknown as Game;
        game.favoriteIsWinner = g.official && game.favorite.teamId === g.winnerId;
        game.underdogIsWinner = g.official && game.underdog.teamId === g.winnerId;
        return game;
      } catch (ex) {
        console.log('oops', ex);
        return {};
      }
    });
    return {
      ...w,
      gamesByDay: games.reduce((acc: Record<string, { displayTime: string; games: Game[] }>, game: Game | any) => {
        const displayTime = (game as any)?.displayTime ?? 'Unknown';
        if (!acc[displayTime]) {
          acc[displayTime] = {
            displayTime,
            games: [] as Game[],
          };
        }
        acc[displayTime].games.push(game as Game);
        return acc;
      }, {} as Record<string, { displayTime: string; games: Game[] }>),
      games,
    };
  }) as unknown as Week[];

  return weeks;
}
