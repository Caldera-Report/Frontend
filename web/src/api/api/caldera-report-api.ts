import {
  ActivityLoadResponseSchema,
  ActivityReportArraySchema,
  CompletionsLeaderBoardResponseArraySchema,
  OpTypeArraySchema,
  PlayerArraySchema,
  PlayerSchema,
  TimeLeaderBoardResponseArraySchema,
  type ActivityLoadResponse,
  type ActivityReportDTO,
  type CompletionsLeaderBoardResponse,
  type OpTypeDTO,
  type PlayerDTO,
  type TimeLeaderBoardResponse,
} from '../models/schemas'
import { ZodError } from 'zod'

const apiBaseUrl = import.meta.env.API_BASE_URL || '/api'

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

type Schema<T> = { parse: (data: unknown) => T }

interface FetchOptions<T> {
  schema: Schema<T>
  url: string
  init?: RequestInit
  mapError?: (err: unknown) => Error
}

const apiFetch = async <T>({ schema, url, init, mapError }: FetchOptions<T>): Promise<T> => {
  let response: Response | undefined
  try {
    response = await fetch(url, init)
    if (!response.ok) {
      throw new APIError(
        `API request failed with status ${response.status}`,
        response.status,
        response,
      )
    }
    const json = await response.json()
    return schema.parse(json)
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Response validation failed', error.issues)
      throw new APIError('Response validation failed', response?.status, response)
    }
    if (mapError) {
      throw mapError(error)
    }
    console.error('Error fetching API:', error)
    throw error
  }
}

export async function fetchPlayers(): Promise<PlayerDTO[]> {
  return apiFetch<PlayerDTO[]>({ schema: PlayerArraySchema, url: `${apiBaseUrl}/players` })
}

export async function searchForPlayer(playerName: string): Promise<PlayerDTO[]> {
  return apiFetch<PlayerDTO[]>({
    schema: PlayerArraySchema,
    url: `${apiBaseUrl}/players/search`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    },
  })
}

export async function getActivities(): Promise<OpTypeDTO[]> {
  return apiFetch<OpTypeDTO[]>({ schema: OpTypeArraySchema, url: `${apiBaseUrl}/activities` })
}

export async function getPlayer(playerId: string, membershipType: number): Promise<PlayerDTO> {
  return apiFetch<PlayerDTO>({
    schema: PlayerSchema,
    url: `${apiBaseUrl}/players/${membershipType}/${playerId}`,
  })
}

export async function getPlayerReportsForActivity(
  playerId: string,
  activityId: string,
): Promise<ActivityReportDTO[]> {
  return apiFetch<ActivityReportDTO[]>({
    schema: ActivityReportArraySchema,
    url: `${apiBaseUrl}/players/${playerId}/stats/${activityId}`,
  })
}

export async function updatePlayerActivityReports(playerId: string): Promise<ActivityLoadResponse> {
  return apiFetch<ActivityLoadResponse>({
    schema: ActivityLoadResponseSchema,
    url: `${apiBaseUrl}/players/${playerId}/load`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  })
}

export async function getCompletionsLeaderboard(
  activityId: string,
): Promise<CompletionsLeaderBoardResponse[]> {
  return apiFetch<CompletionsLeaderBoardResponse[]>({
    schema: CompletionsLeaderBoardResponseArraySchema,
    url: `${apiBaseUrl}/activities/leaderboards/completions/${activityId}`,
  })
}

export async function getBestTimesLeaderboard(
  activityId: string,
): Promise<TimeLeaderBoardResponse[]> {
  return apiFetch<TimeLeaderBoardResponse[]>({
    schema: TimeLeaderBoardResponseArraySchema,
    url: `${apiBaseUrl}/activities/leaderboards/speed/${activityId}`,
  })
}

export async function getTotalTimeLeaderboard(
  activityId: string,
): Promise<TimeLeaderBoardResponse[]> {
  return apiFetch<TimeLeaderBoardResponse[]>({
    schema: TimeLeaderBoardResponseArraySchema,
    url: `${apiBaseUrl}/activities/leaderboards/totalTime/${activityId}`,
  })
}
