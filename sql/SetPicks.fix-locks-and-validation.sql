/*
  Fix: SetPicks fails with two open weeks and doesn't validate picks

  Problems
    1. The started-lock check uses `WeekID = (select WeekID ...)`. When a
       player has started locks in two open weeks (e.g. Week 15 and Week 16
       both live), the subquery returns two rows and the procedure errors, so
       none of the player's picks save.
    2. Picks aren't validated: any GameId is accepted (any week, any season),
       the team doesn't have to be in the game, the player doesn't have to be
       in the season, and more than one lock per week can be saved.
    3. Moving a lock to another game leaves the old lock in place unless the
       old game is resubmitted with GOW = 0.
    4. UpdatePickCount is called with the unvalidated @Picks, and nothing runs
       in a transaction, so a failure part-way can leave picks half-saved.

  Change
    Same name and parameters, so existing callers keep working. @Updated is
    still accepted but no longer used: "now" comes from the database clock,
    converted to US Eastern (AT TIME ZONE handles daylight saving time) to
    match Game.Gametime, so the caller's clock can't affect when picks close.

    A pick is saved only when:
      - its game is in the current season, in a live, unofficial week,
        and hasn't started;
      - the team is the game's favorite or underdog;
      - the player is in the current season (PlayersSeason).

    Locks (GOW):
      - more than one lock in a week raises error 50001
        'Only one lock per week.' and nothing is saved;
      - a week whose lock game has started keeps that lock (new locks that
        week are saved as normal picks);
      - setting a lock clears the player's other unstarted lock that week.

    Everything runs in one transaction. Returns one row: saved = the number
    of picks accepted (changed or unchanged). Picks that weren't accepted
    (e.g. the game started while the page was open) are skipped silently.

  Apply
    Run this script against the sfl database. No data changes are needed.
*/
CREATE OR ALTER PROCEDURE [dbo].[SetPicks]
	@PlayerId int,
	@Updated datetime = null, -- ignored; kept so existing callers still work
	@Picks dbo.MakePicks READONLY
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

	-- Game.Gametime is US Eastern wall-clock time.
	declare @now datetime =
		cast(sysdatetimeoffset() at time zone 'Eastern Standard Time' as datetime);

	declare @seasonId int = (
		select top 1 s.SeasonID from Season s
		where s.IsCurrent = 1 and s.Active = 1
		order by s.Sort desc);

	declare @valid table (
		GameID int primary key,
		Pick int not null,
		GOW bit not null,
		WeekID int not null);

	insert into @valid (GameID, Pick, GOW, WeekID)
	select p.GameId, p.Pick, isnull(p.GOW, 0), g.WeekID
	from (select GameId, max(Pick) Pick, cast(max(cast(GOW as int)) as bit) GOW
	      from @Picks
	      where GameId is not null and Pick is not null
	      group by GameId
	      having count(distinct Pick) = 1) p -- drop a game sent with two teams
	join Game g on g.GameID = p.GameId
	join Week w on w.WeekID = g.WeekID
	where w.SeasonID = @seasonId and w.Live = 1 and w.Official = 0
		and g.Gametime > @now
		and p.Pick in (g.FavoriteID, g.UnderdogID)
		and exists (select 1 from PlayersSeason ps
			where ps.SeasonID = @seasonId and ps.PlayerId = @PlayerId);

	if exists (select 1 from @valid where GOW = 1 group by WeekID having count(*) > 1)
		throw 50001, 'Only one lock per week.', 1;

	begin transaction;

	-- A week whose lock game has started keeps that lock.
	update v set GOW = 0
	from @valid v
	where v.GOW = 1 and exists (
		select 1 from Pick pk join Game g on g.GameID = pk.GameID
		where pk.PlayerId = @PlayerId and pk.GOW = 1
			and g.WeekID = v.WeekID and g.Gametime <= @now);

	-- Moving a lock: clear the player's other unstarted lock in that week.
	update pk set GOW = 0, Updated = @now
	from Pick pk
	join Game g on g.GameID = pk.GameID
	where pk.PlayerId = @PlayerId and pk.GOW = 1 and g.Gametime > @now
		and g.WeekID in (select WeekID from @valid where GOW = 1)
		and pk.GameID not in (select GameID from @valid where GOW = 1);

	update pk set Pick = v.Pick, GOW = v.GOW, Updated = @now
	from Pick pk
	join @valid v on v.GameID = pk.GameID
	where pk.PlayerId = @PlayerId and (pk.Pick <> v.Pick or pk.GOW <> v.GOW);

	insert into Pick (PlayerId, GameID, Pick, Updated, GOW)
	select @PlayerId, v.GameID, v.Pick, @now, v.GOW
	from @valid v
	where not exists (
		select 1 from Pick pk where pk.PlayerId = @PlayerId and pk.GameID = v.GameID);

	declare @counted dbo.MakePicks;
	insert into @counted (GameId, Pick, GOW) select GameID, Pick, GOW from @valid;
	exec UpdatePickCount @counted;

	commit;

	select count(*) saved from @valid;
END
