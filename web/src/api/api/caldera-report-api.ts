import {
  ActivityReportArraySchema,
  OpTypeArraySchema,
  PlayerArraySchema,
  PlayerSchema,
  type ActivityReportDTO,
  type OpTypeDTO,
  type PlayerDTO,
} from '../models/schemas'
import { z, ZodError } from 'zod'

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

export async function GetPlayerReportsForActivity(
  playerId: string,
  activityId: string,
): Promise<ActivityReportDTO[]> {
  return apiFetch<ActivityReportDTO[]>({
    schema: ActivityReportArraySchema,
    url: `${apiBaseUrl}/players/${playerId}/stats/${activityId}`,
  })
}
