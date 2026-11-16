This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Updating Packages

This project uses [`npm-check-updates`](https://github.com/raineorshine/npm-check-updates) to upgrade dependencies to their latest versions:

```bash
npx npm-check-updates -u   # or `ncu -u` if installed globally
npm install
```

`ncu -u` rewrites the version ranges in `package.json`; `npm install` then installs them and updates `package-lock.json`. Run `npm run build` and `npm run lint` afterwards to catch breaking changes.

## Standings

The Standings page (`/standings`) reads precalculated data from the `SeasonStanding` and `WeekStanding` tables ([`src/models/standings.ts`](src/models/standings.ts)). These tables are read-only, derived data: the app never writes to them. They are rebuilt by the `SetStandings` stored procedure.

### Rebuilding standings

`SetStandings @WeekID` recalculates one week, and that week's season, for every league. Run it after a week's games are marked official.

Each week reads the previous two weeks' rows (for "previous rank"), so when rebuilding more than one week, run them **oldest first within each season**. To rebuild everything (takes about two minutes):

```sql
declare @weekId int;
declare weeks cursor local fast_forward for
  select w.WeekID
  from Week w
  where exists (select 1 from Game g where g.WeekID = w.WeekID and g.Official = 1)
  order by w.SeasonID, w.Sort;
open weeks;
fetch next from weeks into @weekId;
while @@fetch_status = 0
begin
  exec SetStandings @weekId;
  fetch next from weeks into @weekId;
end;
close weeks;
deallocate weeks;
```

### Leagues

Standings are stored per league in the `League` column:

| Code      | Standings                                |
| --------- | ---------------------------------------- |
| `O`       | Combined (college and NFL games)         |
| `COLLEGE` | College games only                       |
| `NFL`     | NFL games only                           |

### What is displayed

- **Seasons:** only active seasons (`Season.Active = 1`). The page opens on the current season (`Season.IsCurrent = 1`), overall standings.
- **Weeks:** only live weeks (`Week.Live = 1`) that have standings.
- **PNG players:** players marked persona non grata (`Player.PNG = 1`) are hidden from every table. They are still included in the stored calculations (ranks, games behind, weekly wins), so the visible ranks skip their position (e.g. 24, 26).
- **Leagues with no games in a week:** if a league had no official games that week (e.g. an NFL-only week), its table is replaced by "No official … games this week", since every player would be 0-0.

### Stored procedure fix

[`sql/SetWeeklyStanding.fix-empty-week-weekly-wins.sql`](sql/SetWeeklyStanding.fix-empty-week-weekly-wins.sql) fixes `SetWeeklyStanding`. Without it, a week in which a league had no official games credits every player with an extra season-to-date weekly win (and weekly win with ties) in that week's rows. After applying it to a database, rebuild the standings as above.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
