import { z } from 'zod'

export interface OpTypeDTO {
  id: number
  name: string
  activityTypes?: ActivityTypeDTO[]
}

export interface ActivityTypeDTO {
  id: string
  name: string
  opTypeId: number
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
  activityTypeId: string
}

export interface PlayerDTO {
  id: string
  membershipType: number
  displayName: string
  displayNameCode: number
  fullDisplayName: string
}

export const OpTypeSchema: z.ZodType<OpTypeDTO> = z.lazy(() =>
  z
    .object({
      id: z.number(),
      name: z.string(),
      activityTypes: ActivityTypeSchema.array().optional(),
    })
    .strict(),
)

export const ActivityTypeSchema: z.ZodType<ActivityTypeDTO> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      opTypeId: z.number(),
      activities: ActivitySchema.array().optional(),
    })
    .strict(),
)

export const ActivityReportSchema: z.ZodType<ActivityReportDTO> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      instanceId: z.string(),
      date: z
        .union([z.string().datetime(), z.date()])
        .transform((v) => (v instanceof Date ? v : new Date(v))),
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
      activityTypeId: z.string(),
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
      fullDisplayName: z.string(),
    })
    .strict(),
)

export const PlayerArraySchema = PlayerSchema.array()
export const OpTypeArraySchema = OpTypeSchema.array()
export const ActivityReportArraySchema = ActivityReportSchema.array()
