import { ActivityReport } from './activity-report'

export class Player {
  id!: string
  membershipType!: number
  displayName!: string
  displayNameCode!: number
  fullDisplayName!: string
  lastPlayed?: Date
  lastPlayedActivityId?: number
  lastUpdateStarted?: Date
  lastUpdateCompleted?: Date
  lastProfileView?: Date
  updatePriority?: number
  lastUpdateStatus?: string
  activityReports?: ActivityReport[]
  lastActivityReport?: ActivityReport
}
