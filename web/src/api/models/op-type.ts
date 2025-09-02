import { ActivityType } from './activity-type'

export class OpType {
  id!: number
  name!: string
  activityTypes?: ActivityType[]
}
