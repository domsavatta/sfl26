/*
  Fix: SetWeeklyStanding over-counts season-to-date weekly wins in empty weeks

  Problem
    When the current week has no official games for a league (e.g. no college
    games in an NFL-only week), every player is 0-0, ties for first, and gets
    Ranking = 1 and GamesBehind = 0. The current-week part of the
    OWeeklyWins / OWeeklyWinsWithTies counts reads @weekly without checking
    TotalGames, so every player is credited one extra weekly win (and one extra
    weekly win with ties). The previous-weeks part, the OGOWB count, and
    SetOverallStanding all already require TotalGames > 0.

  Change
    Adds `w.TotalGames > 0 and` to the two @weekly subqueries for wws and wwst.
    Nothing else in the procedure is changed.

  Apply
    1. Run this script against the sfl database.
    2. Rebuild the derived standings so existing rows are corrected:
       exec SetStandings @WeekID  -- for each affected week, oldest first per season
       (only weeks where a league had no official games have different results).
*/
CREATE OR ALTER PROCEDURE [dbo].[SetWeeklyStanding]
	@weekID int, @League nvarchar(20)
AS
	 SET NOCOUNT ON 
BEGIN
delete from weekStanding where weekid = @weekid and League = @League
END

BEGIN

declare @leagues table (l nvarchar(20))
BEGIN
if @League = 'O'
BEGIN
	Insert into @leagues (l) values ('NFL');
	Insert into @leagues (l) values ('COLLEGE');
END
if @League = 'NFL'
BEGIN
	Insert into @leagues (l) values ('NFL');
END
if @League = 'College'
BEGIN
	Insert into @leagues (l) values ('COLLEGE');
END
END

declare @PreviousWeekID int;
declare @LastPreviousWeekID int;
declare @SeasonID int;
declare @weeksort int;
set @weeksort = (select sort from Week where WeekID = @weekID)
set @SeasonID = (select seasonid from Week where WeekID = @weekID)
set @PreviousWeekID = (select a.weekid from week as a join week as b on a.Sort = (b.Sort - 1) and a.SeasonID = b.SeasonID and b.WeekID = @weekID)
set @LastPreviousWeekID = (select a.weekid from week as a join week as b on a.Sort = (b.Sort - 1) and a.SeasonID = b.SeasonID and b.WeekID = @PreviousWeekID)

DECLARE @weekly TABLE (WeekID int, PlayerId int, Ranking int, RankingWithTies int, CorrectPicks int,  DifficultyPoints int, QualityPoints float, TotalGames int, GOW float,
	PreviousWeekRank int, LastPreviousWeekRank int, PWRwithTies int, LPWRwithTies int, GamesBehind int)
DECLARE @overall table (SeasonID int, PlayerId int, OCorrectPicks int, ODifficultyPoints int, OQualityPoints float, 
	OGOW int, OGOWB int, OTotalGames int, OWeeklyWins int, OWeeklyWinsWithTies int)
DECLARE @overallRanked table (ORanking int, ORankingWithTies int, SeasonID int, PlayerId int, OCorrectPicks int, ODifficultyPoints int, OQualityPoints float, 
	OGOW int, OGOWB int, OTotalGames int, OGamesBehind int, OWeeklyWins int, OWeeklyWinsWithTies int)

insert into @weekly (ranking, weekid, playerid, correctpicks, difficultypoints, qualitypoints, TotalGames, GOW, PreviousWeekRank, LastPreviousWeekRank, PWRwithTies, LPWRwithTies)
SELECT row_number() OVER (ORDER BY  cps DESC, gowp desc, qps desc, dps desc) AS 'Row Numba', weekid, playerid, cps, isnull(dps, 0) as dps, qps, 
	(SELECT COUNT(Game.GameID) AS games FROM   Game INNER JOIN Team ON Game.FavoriteID = Team.TeamID WHERE Game.WeekID = @weekID AND Game.Official = 1 and Team.League in (select l from @leagues)) as totalgames,
	gowp, PWR, LPWR, PWRT, LPWRT from
		(SELECT Week.WeekID, Player.PlayerID, dps, 
			isnull(derivedtbl_1.qps,0) as qps,
			isnull(derivedtbl_1.cps, 0) as cps, 
			isnull(derivedtbl_1.gowp, 0) as gowp,
			ISNULL((select top 1 ranking from weekstanding where weekid = @PreviousWeekID and weekstanding.PlayerId = Player.PlayerID and League = @League),0) as PWR,
			ISNULL((select top 1 ranking from weekstanding where weekid = @LastPreviousWeekID and weekstanding.PlayerId = Player.PlayerID and League = @League),0) as LPWR,
			ISNULL((select top 1 RankingWIthTies from weekstanding where weekid = @PreviousWeekID and weekstanding.PlayerId = Player.PlayerID and League = @League),0) as PWRT,
			ISNULL((select top 1 RankingWIthTies from weekstanding where weekid = @LastPreviousWeekID and weekstanding.PlayerId = Player.PlayerID and League = @League),0) as LPWRT
	FROM Player INNER JOIN
		PlayersSeason ON Player.PlayerID = PlayersSeason.PlayerID INNER JOIN
		Week ON Week.SeasonID = PlayersSeason.SeasonID LEFT OUTER JOIN
			(SELECT TOP (100) PERCENT Pick.PlayerID, COUNT(Pick.PlayerID) AS cps, 
				SUM(CASE  WHEN (@seasonID <= 15) THEN 0 ELSE Game_1.QualityPoints END) AS qps, 
				SUM(Game_1.DifficultyPoints) AS dps,		
				SUM(CASE WHEN (Pick.GOW = 1) THEN Game_1.QualityPoints ELSE 0 END) AS gowp
			FROM Pick INNER JOIN
				Game AS Game_1 ON Pick.Pick = Game_1.WinnerID AND Pick.GameID = Game_1.GameID INNER JOIN
				Team AS Team_1 ON Game_1.FavoriteID = Team_1.TeamID INNER JOIN
				Week AS Week_1 ON Game_1.WeekID = Week_1.WeekID INNER JOIN
				Player AS Player_1 ON Pick.PlayerID = Player_1.PlayerID
			WHERE (Game_1.Official = 1 AND Week_1.WeekID = @weekID and Team_1.League in (select l from @leagues))
			GROUP BY Pick.PlayerID, Player_1.Name, Player_1.PlayerID) AS derivedtbl_1 
		ON Player.PlayerID = derivedtbl_1.PlayerID
	WHERE (Week.WeekID = @weekID)) shit
END
SET nocount ON

UPDATE U
   SET U.GamesBehind = ((select CorrectPicks from @weekly where Ranking = 1) - U.CorrectPicks), U.RankingWithTies = V.Ranking FROM @weekly AS U join
	@weekly as V on u.CorrectPicks = V.CorrectPicks and v.Ranking = (select top 1 ranking from @weekly as w where w.CorrectPicks = v.CorrectPicks)

UPDATE U
   SET U.Ranking = V.Ranking FROM @weekly AS U join
	@weekly as V on 
	v.Ranking = (select top 1 ranking from @weekly as w where w.CorrectPicks = u.CorrectPicks and w.DifficultyPoints = u.DifficultyPoints and w.GOW = u.GOW and w.QualityPoints = u.QualityPoints order by Ranking asc)


BEGIN
BEGIN
	insert into @overall (SeasonID, PlayerId, OCorrectPicks, ODifficultyPoints, OQualityPoints, OGOW, OTotalGames, OWeeklyWins, OWeeklyWinsWithTies, OGOWB)
	SELECT     @seasonID, playerid, cps, dps, qps, OGOW, totalGames, wws, wwst, gowb from
	(SELECT     Player.PlayerID, Player.Name AS PlayerName, isnull(derivedtbl_1.cps,0) AS cps, 
						  isnull(derivedtbl_1.qps, 0) AS qps, 
						  (SELECT COUNT(Game.GameID) FROM Game INNER JOIN Week ON Game.WeekID = Week.WeekID INNER JOIN Team ON Game.FavoriteID = Team.TeamID
									WHERE Week.SeasonID = @seasonID and Game.Official = 1 and Week.Sort <= @weeksort and Team.League in (select l from @leagues)) AS totalgames, isnull(derivedtbl_1.dps,0) AS dps, isnull(derivedtbl_1.gowp, 0) as OGOW, wws, wwst, gowb
	FROM         Player INNER JOIN
						  PlayersSeason AS pps ON Player.PlayerID = pps.PlayerID LEFT OUTER JOIN
							  (SELECT TOP (100) PERCENT Pick.PlayerID, Player_1.Name AS PlayerName, COUNT(Pick.PlayerID) AS cps, 
								SUM(CASE WHEN (@seasonID <= 15) THEN 0 ELSE Game_1.QualityPoints END) AS qps,
								SUM(CASE WHEN (Pick.GOW = 1) THEN 1 ELSE 0 END) AS gowp,
								SUM(Game_1.DifficultyPoints) AS dps,
								((Select count(weekid) from @weekly as w where w.TotalGames > 0 and w.Ranking = 1 and w.playerid = Pick.PlayerID) + 
									(Select count(weekid) from WeekStanding as x where x.TotalGames > 0 and x.League = @League and x.Ranking = 1 and x.playerid = Pick.PlayerID and x.weekid in (select weekid from week where SeasonID = @SeasonID and Sort <= @weeksort))) as wws,
								((Select count(weekid) from @weekly as w where w.TotalGames > 0 and w.GamesBehind = 0 and w.playerid = Pick.PlayerID) + 
									(Select count(weekid) from WeekStanding as x where x.TotalGames > 0 and x.League = @League and x.GamesBehind = 0 and x.playerid = Pick.PlayerID and x.weekid in (select weekid from week where SeasonID = @SeasonID and Sort <= @weeksort))) as wwst,
								((Select count(WeekID) from @weekly as x where x.TotalGames > 0 and GOW = (select max(gow) from @weekly) and x.PlayerId = Pick.PlayerId) +
									(select count(weekid) from WeekStanding as w where w.TotalGames > 0 and w.PlayerId = Pick.PlayerId and w.League = @League and GOW = (select max(gow) from WeekStanding where WeekID = w.WeekID and League = @League) and w.weekid in (select weekid from week where SeasonID = @SeasonID and Sort <= @weeksort))) as gowb
									FROM Pick INNER JOIN 
									Game AS Game_1 ON Pick.Pick = Game_1.WinnerID AND Pick.GameID = Game_1.GameID INNER JOIN
									Team AS Team_1 ON Game_1.FavoriteID = Team_1.TeamID INNER JOIN
									Week AS Week_1 ON Game_1.WeekID = Week_1.WeekID INNER JOIN
									Player AS Player_1 ON Pick.PlayerID = Player_1.PlayerID
									WHERE (Week_1.SeasonID = @seasonID AND Game_1.Official = 1 and Week_1.Sort <= @weeksort and Team_1.League in (select l from @leagues))
									GROUP BY Pick.PlayerID, Player_1.Name, Player_1.PlayerID) AS derivedtbl_1 ON Player.PlayerID = derivedtbl_1.PlayerID
	WHERE     (pps.SeasonID = @seasonID)) shit
	END
	BEGIN
	insert into @overallRanked (ORanking, SeasonID, PlayerId, OCorrectPicks, ODifficultyPoints, OQualityPoints, OGOW, OTotalGames, OWeeklyWins, OWeeklyWinsWithTies, OGOWB)
	SELECT row_number() OVER (ORDER BY  OCorrectPicks DESC, OWeeklyWins desc, OWeeklyWinsWithTies desc, OGOW desc, OGOWB desc, OQualityPoints desc, ODifficultyPoints desc) AS 'Row Numba', @SeasonID, playerid, OCorrectPicks, 
		ODifficultyPoints, OQualityPoints, OGOW, OTotalGames, OWeeklyWins, OWeeklyWinsWithTies, OGOWB
	from @overall

	END

	UPDATE U
		SET U.OGamesBehind = ((select OCorrectPicks from @overallRanked where ORanking = 1) - U.OCorrectPicks), U.ORankingWithTies = V.ORanking FROM @overallRanked AS U join
		@overallRanked as V on u.OCorrectPicks = V.OCorrectPicks and v.ORanking = (select top 1 ORanking from @overallRanked as w where w.OCorrectPicks = v.OCorrectPicks)
	UPDATE U
		SET U.ORanking = V.ORanking FROM @overallRanked AS U join
		@overallRanked as V on v.ORanking = (select top 1 ORanking from @overallRanked as w where w.OCorrectPicks = u.OCorrectPicks and w.OWeeklyWins = u.OWeeklyWins and w.OWeeklyWinsWithTies = u.OWeeklyWinsWithTies and w.OGOW = u.OGOW and w.OGOWB = u.OGOWB and w.ODifficultyPoints = u.ODifficultyPoints and w.OQualityPoints = u.OQualityPoints)
END

--select * from @weekly order by ranking 
 insert into WeekStanding (WeekID, PlayerId, Ranking, RankingWithTies, CorrectPicks, DifficultyPoints, QualityPoints, TotalGames, GOW, PreviousWeekRank, LastPreviousWeekRank, PWRwithTies, LPWRwithTies, GamesBehind, ORanking, ORankingWithTies, OCorrectPicks, ODifficultyPoints, OQualityPoints, OGOW, OTotalGames, OGamesBehind, OWeeklyWins, OWeeklyWinsWithTies, League, OGOWB)
  Select @weekID, w.PlayerId, w.Ranking, w.RankingWithTies, w.CorrectPicks, w.DifficultyPoints, w.QualityPoints, w.TotalGames, w.GOW, w.PreviousWeekRank, w.LastPreviousWeekRank, w.PWRwithTies, w.LPWRwithTies, w.GamesBehind,
  o.ORanking, o.ORankingWithTies, o.OCorrectPicks, o.ODifficultyPoints, o.OQualityPoints, o.OGOW, o.OTotalGames, o.OGamesBehind, isnull(o.OWeeklyWins,0), isnull(OWeeklyWinsWithTies,0), @League, isnull(OGOWB,0)  from @weekly as w join @overallRanked as o on w.PlayerId = o.PlayerId
