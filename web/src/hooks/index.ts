import {
  fetchPlayers,
  getActivities,
  getPlayer,
  getPlayerReportsForActivity,
  updatePlayerActivityReports,
  searchForPlayer,
  getCompletionsLeaderboard,
  getBestTimesLeaderboard,
  getTotalTimeLeaderboard,
} from '@/api/api/caldera-report-api'
import { getPGCR, getActivitiesBungie, getClanForUser } from '@/api/http/bungieClient'
import type { ActivityReportListDTO, OpTypeDTO, PlayerDTO, PlayerSearchDTO } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  type DestinyActivityDefinition,
  type DestinyPostGameCarnageReportData,
} from 'bungie-api-ts/destiny2'
import type { GetGroupsForMemberResponse } from 'bungie-api-ts/groupv2'
import { unref, type Ref } from 'vue'

export const usePlayers = () => {
  return useQuery<PlayerSearchDTO[]>({
    queryKey: ['players'],
    queryFn: fetchPlayers,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export const useSearchPlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: searchForPlayer,
    onSuccess: (data) => {
      queryClient.setQueryData<PlayerSearchDTO[]>(['players'], (old = []) => {
        if (!data.length) return old
        const existing = new Set(old.map((p) => p.id))
        const merged = [...old]
        for (const p of data) {
          if (!existing.has(p.id)) {
            merged.push(p)
          }
        }
        return merged
      })
    },
    retry: 1,
  })
}

export const useAllActivities = () => {
  return useQuery<OpTypeDTO[]>({
    queryKey: ['activities'],
    queryFn: getActivities,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export const usePlayer = (membershipId: string | Ref<string>) => {
  return useQuery<PlayerDTO>({
    queryKey: ['player', membershipId],
    queryFn: () => getPlayer(unref(membershipId)),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export const usePlayerReportsForActivity = (
  playerId: string,
  activityId: string,
  enabled?: boolean | import('vue').Ref<boolean>,
) => {
  return useQuery<ActivityReportListDTO>({
    queryKey: ['playerReports', playerId, activityId],
    queryFn: () => getPlayerReportsForActivity(playerId, activityId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: (enabled as boolean) ?? true,
  })
}

export const useUpdatePlayerActivityReports = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (playerId: string) => updatePlayerActivityReports(playerId),
    onSuccess: (_data, playerId) => {
      queryClient.refetchQueries({ queryKey: ['playerReports', playerId] })
    },
    retry: 1,
  })
}

export const useCompletionsLeaderboard = (activityId: string | Ref<string>) => {
  return useQuery<{ player: PlayerDTO; completions: number }[]>({
    queryKey: ['completionsLeaderboard', activityId],
    queryFn: () => getCompletionsLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: () => {
      const id = unref(activityId) as string | undefined | null
      return id !== undefined && id !== null && id !== ''
    },
  })
}

export const useBestTimesLeaderboard = (activityId: string | Ref<string>) => {
  return useQuery<{ player: PlayerDTO; time: string }[]>({
    queryKey: ['bestTimesLeaderboard', activityId],
    queryFn: () => getBestTimesLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: () => {
      const id = unref(activityId) as string | undefined | null
      return id !== undefined && id !== null && id !== ''
    },
  })
}

export const useTotalTimeLeaderboard = (activityId: string | Ref<string>) => {
  return useQuery<{ player: PlayerDTO; time: string }[]>({
    queryKey: ['totalTimeLeaderboard', activityId],
    queryFn: () => getTotalTimeLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: () => {
      const id = unref(activityId) as string | undefined | null
      return id !== undefined && id !== null && id !== ''
    },
  })
}

export const useActivityReport = (instanceId: string) => {
  return useQuery<DestinyPostGameCarnageReportData>({
    queryKey: ['activityReport', instanceId],
    queryFn: async () => {
      const response = await getPGCR(instanceId)
      return response.Response
    },
    staleTime: 'static',
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export const useClanForUser = (
  membershipId: string | Ref<string>,
  membershipType: number | Ref<number>,
) => {
  return useQuery<GetGroupsForMemberResponse>({
    queryKey: ['clanForUser', membershipId, unref(membershipType)],
    queryFn: () =>
      getClanForUser(unref(membershipId), unref(membershipType)).then((r) => r.Response),
    enabled: () => unref(membershipType) !== 0 && !!unref(membershipId),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

//TODO: Move all manifest stuff to the server, and store it all in a DB somewhere so I don't have to make 2 http requests to get one thing

export const useDestinyActivity = (activityId: number | Ref<number>) => {
  return useQuery<DestinyActivityDefinition>({
    queryKey: ['activity', unref(activityId)],
    queryFn: async () => {
      const id = unref(activityId)
      const response = await getActivitiesBungie()
      return response[id] as DestinyActivityDefinition
    },
    enabled: () => unref(activityId) != 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export type LeaderboardType = 'completions' | 'besttimes' | 'totaltime'
export interface BaseLeaderboardEntry {
  player: PlayerDTO
}
export interface CompletionsEntry extends BaseLeaderboardEntry {
  completions: number
}
export interface TimeEntry extends BaseLeaderboardEntry {
  time: string
}
export type UnifiedLeaderboardRow = CompletionsEntry | TimeEntry

export const useLeaderboard = (typeRef: Ref<LeaderboardType>, activityId: string | Ref<string>) => {
  return useQuery<UnifiedLeaderboardRow[]>({
    queryKey: ['leaderboard', typeRef, activityId],
    queryFn: async () => {
      const t = unref(typeRef)
      const id = unref(activityId)
      if (id === undefined || id === null || id === '') return []
      switch (t) {
        case 'completions':
          return (await getCompletionsLeaderboard(id)) as CompletionsEntry[]
        case 'besttimes':
          return (await getBestTimesLeaderboard(id)) as TimeEntry[]
        case 'totaltime':
          return (await getTotalTimeLeaderboard(id)) as TimeEntry[]
      }
    },
    enabled: () => {
      const id = unref(activityId)
      return id !== undefined && id !== null && id !== ''
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
