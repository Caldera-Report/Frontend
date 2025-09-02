import { Player } from './player'

export class ActivityReport {
  id!: number
  instanceId!: number
  date!: Date
  playerId!: number
  activityId!: number
  completed!: boolean
  duration!: number
  player!: Player
}
