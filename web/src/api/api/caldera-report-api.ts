import { calderaGet, calderaPost } from '../http/calderaClient'
import {
  type ActivityLoadResponse,
  type ActivityReportListDTO,
  type CompletionsLeaderBoardResponse,
  type OpTypeDTO,
  type PlayerDTO,
  type TimeLeaderBoardResponse,
} from '../models/schemas'

export async function fetchPlayers(): Promise<PlayerDTO[]> {
  return calderaGet<PlayerDTO[]>('/players')
}

export async function searchForPlayer(playerName: string): Promise<PlayerDTO[]> {
  return calderaPost<PlayerDTO[]>('/players/search', { playerName })
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

export async function getCompletionsLeaderboard(
  activityId: string,
): Promise<CompletionsLeaderBoardResponse[]> {
  return calderaGet<CompletionsLeaderBoardResponse[]>(
    `/activities/leaderboards/completions/${activityId}`,
  )
}

export async function getBestTimesLeaderboard(
  activityId: string,
): Promise<TimeLeaderBoardResponse[]> {
  return calderaGet<TimeLeaderBoardResponse[]>(`/activities/leaderboards/speed/${activityId}`)
}

export async function getTotalTimeLeaderboard(
  activityId: string,
): Promise<TimeLeaderBoardResponse[]> {
  return calderaGet<TimeLeaderBoardResponse[]>(`/activities/leaderboards/totalTime/${activityId}`)
}
