import { Player } from '../models'

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

const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new APIError(
        `API request failed with status ${response.status}`,
        response.status,
        response,
      )
    }
    return response.json()
  } catch (error) {
    console.error('Error fetching API:', error)
    throw error
  }
}

export const fetchPlayers = async (): Promise<Player[]> => {
  return apiFetch<Player[]>(`${apiBaseUrl}/playerload`)
}

export const searchForPlayer = async (playerName: string): Promise<Player[]> => {
  return apiFetch<Player[]>(`${apiBaseUrl}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerName }),
  })
}
