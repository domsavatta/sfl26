export type SeasonId = number
export type WeekId = number
export type PlayerId = number
export type TeamId = number
export type GameId = number
export type GOW = boolean

export type Season = {
  seasonId: SeasonId
  seasonName: string
  live: boolean
  order: number
  isCurrent: boolean
  weeks: Week[]
}

export type WeeklyStanding = {
  playerId: PlayerId
  playerName: string
  rank: number
  correctPicks: number
  incorrectPicks: number
  totalGames: number
  gameOfTheWeek: number
  qualityPoints: number
  difficultyPoints: number
  gamesBehind: number
}

export type SeasonStanding = {
  rank: number
  playerId: PlayerId
  playerName: number
  correctPicks: number
  incorrectPicks: number
  totalGames: number
  weeklyWins: number
  qualityPoints: number
  difficultyPoints: number
  gamesBehind: number
}

export type Week = {
  weekId: WeekId
  weekName: string
  order: number
  live: boolean
  official: boolean
  seasonId: SeasonId
  standings?: WeeklyStanding[]
  gamesByDay?: Record<string, Game[]>
}

export interface AdminWeek extends Week {
  games?: Game[]
}

export interface WeekForMakingPicks extends Week {
  gowPickable: boolean
  games: GameForMakingPicks[]
}

export interface WeekForPicksDisplay extends Week {
  players: WeeksPlayer[]
  games: GameForPicksDisplay[]
}

export interface WeekForHome extends Week {
  games: Game[]
}

export type Team = {
  teamId: TeamId
  teamName: string
  league: 'NFL' | 'College'
  imageId?: string
  score?: number
}

export type FavoriteSite = {
  siteId: number
  site: string
}

export type Pick = {
  teamId: TeamId
  gow: GOW
  picked: boolean
}

export type MakePick = {
  teamId: TeamId
  gameId: GameId
  gow: boolean
}

export type Player = {
  playerId: PlayerId
  playerName: string
}

export interface PlayerSession extends Player {
  isAdmin: boolean
  isActivePlayer: boolean
}

export interface SFLSession {
  expires: string
  user: PlayerSession
}

export interface WeeksPlayer extends Player {
  weeklyRank: number
  seasonRank: number
}

export interface AdminPlayer extends Player {
  firstName: string
  lastName: string
  email: string
  isActivePlayer: boolean
  profile: string
  isAdmin: boolean
  hasCurrentSeasonRole: boolean
  currentSeasonPlayer: boolean
  hidden: boolean
  passwordReset: boolean
}

export type GamesPicks = Record<PlayerId, Pick>

export type Game = {
  gameId: GameId
  favorite: Team
  underdog: Team
  spread: number
  favoriteSite: FavoriteSite
  gametime: string
  kickoff: string
  displayTime: string
  underdogPickCount: number
  favoritePickCount: number
  official: boolean
  favoriteScore?: number
  underdogScore?: number
  winnerId?: TeamId
  favoriteIsWinner?: boolean
  underdogIsWinner?: boolean
  tie?: boolean
  storyline: string
  difficultyPoints?: number
  qualityPoints?: number
  pickable: boolean
}

export interface AdminGame extends Game {
  weekId: WeekId
  favoriteId: TeamId
  underdogScore?: number
  favoriteScore?: number
  underdogId: TeamId
  winnerId: TeamId
}

export interface GameForMakingPicks extends Game {
  pick: TeamId | null
  gow: GOW | null
}
export interface GameForPicksDisplay extends Game {
  picks: GamesPicks
}

export type MakePicksState = [weeks: WeekForMakingPicks[], setWeekData: any]
