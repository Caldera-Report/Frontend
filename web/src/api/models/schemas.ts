import { z } from 'zod'

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

export interface ActivityLoadResponse {
  success: boolean
}

export interface CompletionsLeaderBoardResponse {
  player: PlayerDTO
  completions: number
}

export interface TimeLeaderBoardResponse {
  player: PlayerDTO
  time: string
}

export const OpTypeSchema: z.ZodType<OpTypeDTO> = z.lazy(() =>
  z
    .object({
      id: z.number(),
      name: z.string(),
      activities: ActivitySchema.array().optional(),
    })
    .strict(),
)

export const ActivityReportSchema: z.ZodType<ActivityReportDTO> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      instanceId: z.string(),
      date: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v : new Date(v))),
      playerId: z.string(),
      activityId: z.string(),
      completed: z.boolean(),
      duration: z.string(),
      player: z.lazy(() => PlayerSchema).optional(),
    })
    .strict(),
)

export const ActivitySchema: z.ZodType<ActivityDTO> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      imageURL: z.string(),
      index: z.number(),
      opTypeId: z.number(),
    })
    .strict(),
)

export const PlayerSchema = z.lazy(() =>
  z
    .object({
      id: z.string(),
      membershipType: z.number(),
      displayName: z.string(),
      displayNameCode: z.number(),
      lastPlayedCharacterEmblemPath: z.string().nullable().optional(),
      lastPlayedCharacterBackgroundPath: z.string().nullable().optional(),
      fullDisplayName: z.string(),
    })
    .strict(),
)

export const ActivityLoadResponseSchema = z.lazy(() =>
  z
    .object({
      success: z.boolean(),
    })
    .strict(),
)

export const CompletionsLeaderBoardResponseSchema = z.lazy(() =>
  z
    .object({
      player: PlayerSchema,
      completions: z.number(),
    })
    .strict(),
)

export const TimeLeaderBoardResponseSchema = z.lazy(() =>
  z
    .object({
      player: PlayerSchema,
      time: z.string(),
    })
    .strict(),
)

export const PlayerArraySchema = PlayerSchema.array()
export const OpTypeArraySchema = OpTypeSchema.array()
export const ActivityReportArraySchema = ActivityReportSchema.array()
export const CompletionsLeaderBoardResponseArraySchema =
  CompletionsLeaderBoardResponseSchema.array()
export const TimeLeaderBoardResponseArraySchema = TimeLeaderBoardResponseSchema.array()
