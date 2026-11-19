/**
 * Helpers for database tests (npm run test:db).
 *
 * Every test runs inside a transaction that is rolled back afterwards (see
 * setup-db.ts), and app queries made through `query` from "db" run inside it
 * too. Tests create their own season, weeks, teams, games and players with
 * createFixtures(), so they don't depend on, or change, real data.
 *
 * This module must not import "db": setup-db.ts mocks "db" using it.
 */
import sql from "mssql";

let tx: sql.Transaction | null = null;

export async function beginTestTransaction(pool: sql.ConnectionPool) {
  tx = new sql.Transaction(pool);
  await tx.begin();
}

export async function rollbackTestTransaction() {
  const current = tx;
  tx = null;
  if (!current) return;
  try {
    await current.rollback();
  } catch {
    // Already rolled back by the server (e.g. an error with XACT_ABORT ON).
  }
}

/** A new request inside the current test's transaction. */
export function testRequest() {
  if (!tx) throw new Error("No test transaction; is test/setup-db.ts loaded?");
  return new sql.Request(tx);
}

export type Fixtures = {
  seasonId: number;
  /** In the season. */
  playerId: number;
  /** Not in the season. */
  outsiderId: number;
  teams: [number, number, number, number];
  weeks: { open1: number; open2: number; official: number; notLive: number };
  games: {
    /** Week open1: started yesterday; then a1, a2 haven't started. */
    startedA: number;
    a1: number;
    a2: number;
    /** Week open2: started 2 hours ago; then b1, b2 haven't started. */
    startedB: number;
    b1: number;
    b2: number;
    /** Haven't started, but in a week that's official / not live. */
    inOfficialWeek: number;
    inNotLiveWeek: number;
  };
};

/**
 * Creates a new current season (it sorts above every real season) with:
 * - weeks open1 and open2 (live, not official), official, notLive;
 * - teams 1-4: startedA, a1, b1 and the closed-week games are team 1
 *   (favorite) vs team 2; a2, startedB and b2 are team 3 (favorite) vs team 4;
 * - a player in the season and one who isn't.
 */
export async function createFixtures(): Promise<Fixtures> {
  const result = await testRequest().query(`
    declare @now datetime =
      cast(sysdatetimeoffset() at time zone 'Eastern Standard Time' as datetime);

    insert into Season (Name, Sort, Active, TotalPlayers, IsCurrent)
    values ('Test Season', (select isnull(max(Sort), 0) + 1 from Season), 1, 0, 1);
    declare @season int = scope_identity();

    declare @t1 int, @t2 int, @t3 int, @t4 int;
    insert into Team (Name, League) values ('Test Team 1', 'NFL'); set @t1 = scope_identity();
    insert into Team (Name, League) values ('Test Team 2', 'NFL'); set @t2 = scope_identity();
    insert into Team (Name, League) values ('Test Team 3', 'NFL'); set @t3 = scope_identity();
    insert into Team (Name, League) values ('Test Team 4', 'NFL'); set @t4 = scope_identity();

    declare @open1 int, @open2 int, @official int, @notLive int;
    insert into Week (Name, Sort, SeasonID, Live, Official) values ('Test Week 1', 1, @season, 1, 0); set @open1 = scope_identity();
    insert into Week (Name, Sort, SeasonID, Live, Official) values ('Test Week 2', 2, @season, 1, 0); set @open2 = scope_identity();
    insert into Week (Name, Sort, SeasonID, Live, Official) values ('Test Official Week', 3, @season, 1, 1); set @official = scope_identity();
    insert into Week (Name, Sort, SeasonID, Live, Official) values ('Test Hidden Week', 4, @season, 0, 0); set @notLive = scope_identity();

    declare @games table (k varchar(20) primary key, id int);
    declare @id int;
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t1, @t2, dateadd(day, -1, @now), 1, 3.5, @open1);
    insert into @games values ('startedA', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t1, @t2, dateadd(day, 1, @now), 1, 3.5, @open1);
    insert into @games values ('a1', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t3, @t4, dateadd(day, 2, @now), 2, 7, @open1);
    insert into @games values ('a2', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t3, @t4, dateadd(hour, -2, @now), 1, 1, @open2);
    insert into @games values ('startedB', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t1, @t2, dateadd(day, 8, @now), 1, 3, @open2);
    insert into @games values ('b1', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t3, @t4, dateadd(day, 9, @now), 3, null, @open2);
    insert into @games values ('b2', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t1, @t2, dateadd(day, 1, @now), 1, 3, @official);
    insert into @games values ('inOfficialWeek', scope_identity());
    insert into Game (FavoriteID, UnderdogID, Gametime, FavoriteSite, Spread, WeekID)
      values (@t1, @t2, dateadd(day, 1, @now), 1, 3, @notLive);
    insert into @games values ('inNotLiveWeek', scope_identity());

    declare @player int, @outsider int;
    insert into Player (Name) values ('Test Player'); set @player = scope_identity();
    insert into Player (Name) values ('Test Outsider'); set @outsider = scope_identity();
    insert into PlayersSeason (SeasonID, PlayerId) values (@season, @player);

    select @season seasonId, @player playerId, @outsider outsiderId,
      @t1 t1, @t2 t2, @t3 t3, @t4 t4,
      @open1 open1, @open2 open2, @official official, @notLive notLive;
    select k, id from @games;
  `);
  const [[row], gameRows] = result.recordsets as unknown as [
    Record<string, number>[],
    { k: keyof Fixtures["games"]; id: number }[],
  ];
  return {
    seasonId: row.seasonId,
    playerId: row.playerId,
    outsiderId: row.outsiderId,
    teams: [row.t1, row.t2, row.t3, row.t4],
    weeks: {
      open1: row.open1,
      open2: row.open2,
      official: row.official,
      notLive: row.notLive,
    },
    games: Object.fromEntries(
      gameRows.map((g) => [g.k, g.id]),
    ) as Fixtures["games"],
  };
}

/** Inserts a pick directly (test setup; skips all validation). */
export async function insertPick(
  playerId: number,
  gameId: number,
  teamId: number,
  isLock = false,
) {
  await testRequest()
    .input("playerId", sql.Int, playerId)
    .input("gameId", sql.Int, gameId)
    .input("teamId", sql.Int, teamId)
    .input("isLock", sql.Bit, isLock)
    .query(`insert into Pick (PlayerId, GameID, Pick, Updated, GOW)
      values (@playerId, @gameId, @teamId, '20000101', @isLock)`);
}

/** The player's pick for a game, or null. */
export async function getPick(playerId: number, gameId: number) {
  const result = await testRequest()
    .input("playerId", sql.Int, playerId)
    .input("gameId", sql.Int, gameId)
    .query<{ teamId: number; isLock: boolean; updated: Date }>(
      `select Pick teamId, GOW isLock, Updated updated from Pick
       where PlayerId = @playerId and GameID = @gameId`,
    );
  return result.recordset[0] ?? null;
}

/** Game.favoritePickCount / underdogPickCount. */
export async function getPickCounts(gameId: number) {
  const result = await testRequest()
    .input("gameId", sql.Int, gameId)
    .query<{ favorite: number; underdog: number }>(
      `select favoritePickCount favorite, underdogPickCount underdog
       from Game where GameID = @gameId`,
    );
  return result.recordset[0];
}
