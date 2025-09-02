import { ActivityReport } from './activity-report'
import { ActivityType } from './activity-type'

export class Activity {
  id!: number
  name!: string
  imageUrl!: string
  activityTypeId!: number
  activityReports!: ActivityReport[]
  activityType!: ActivityType
}
