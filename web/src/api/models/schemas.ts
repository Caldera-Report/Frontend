export interface OpTypeDTO {
  id: number
  name: string
  activities?: ActivityDTO[]
}

export interface ActivityReportDTO {
  id: string
  instanceId: string
  date: Date
  playerId: string
  activityId: string
  completed: boolean
  duration: string
  player?: PlayerDTO
}

export interface ActivityReportListDTO {
  reports: ActivityReportDTO[]
  average: string
  best: ActivityReportDTO | null
}

export interface ActivityDTO {
  id: string
  name: string
  imageURL: string
  index: number
  opTypeId: number
}

export interface PlayerDTO {
  id: string
  membershipType: number
  displayName: string
  displayNameCode: number
  lastPlayedCharacterEmblemPath?: string | null
  lastPlayedCharacterBackgroundPath?: string | null
  fullDisplayName: string
}

export interface PlayerSearchDTO {
  id: string
  membershipType: number
  lastPlayedCharacterEmblemPath?: string | null
  fullDisplayName: string
}

export interface ActivityLoadResponse {
  success: boolean
}

export interface LeaderboardResponse {
  player: PlayerDTO
  rank: number
  data: string
}
