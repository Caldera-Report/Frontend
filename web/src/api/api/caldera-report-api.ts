import { calderaGet, calderaPost } from '../http/calderaClient'
import {
  type ActivityLoadResponse,
  type ActivityReportListDTO,
  type LeaderboardResponse,
  type OpTypeDTO,
  type PlayerDTO,
  type PlayerSearchDTO,
} from '../models/schemas'

export async function searchForPlayer(playerName: string): Promise<PlayerSearchDTO[]> {
  return calderaPost<PlayerSearchDTO[]>('/players/search', { playerName })
}

export async function getActivities(): Promise<OpTypeDTO[]> {
  return calderaGet<OpTypeDTO[]>('/activities')
}

export async function getPlayer(playerId: string): Promise<PlayerDTO> {
  return calderaGet<PlayerDTO>(`/players/${playerId}`)
}

export async function getPlayerReportsForActivity(
  playerId: string,
  activityId: string,
): Promise<ActivityReportListDTO> {
  return calderaGet<ActivityReportListDTO>(`/players/${playerId}/stats/${activityId}`)
}

export async function updatePlayerActivityReports(playerId: string): Promise<ActivityLoadResponse> {
  return calderaPost<ActivityLoadResponse>(`/players/${playerId}/load`, {})
}

export async function getLeaderboard(
  activityId: string,
  type: number,
  count?: number,
  offset?: number,
): Promise<LeaderboardResponse[]> {
  const params = new URLSearchParams()
  if (typeof count === 'number') params.set('count', count.toString())
  if (typeof offset === 'number') params.set('offset', offset.toString())

  const query = params.toString()
  const suffix = query ? `?${query}` : ''

  return calderaGet<LeaderboardResponse[]>(`/leaderboards/${type}/${activityId}${suffix}`)
}

export async function searchLeaderboard(
  activityId: string,
  type: number,
  playerName: string,
): Promise<LeaderboardResponse[]> {
  return calderaPost<LeaderboardResponse[]>(`leaderboards/${type}/${activityId}/search`, {
    playerName,
  })
}
