import {
  getActivities,
  getPlayer,
  getPlayerReportsForActivity,
  updatePlayerActivityReports,
  searchForPlayer,
  getLeaderboard,
  searchLeaderboard,
} from '@/api/api/caldera-report-api'
import { getPGCR, getActivitiesBungie, getClanForUser } from '@/api/http/bungieClient'
import type { ActivityReportListDTO, OpTypeDTO, PlayerDTO } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  type DestinyActivityDefinition,
  type DestinyPostGameCarnageReportData,
} from 'bungie-api-ts/destiny2'
import type { GetGroupsForMemberResponse } from 'bungie-api-ts/groupv2'
import { unref, type Ref } from 'vue'

export const useSearchPlayer = () => {
  return useMutation({
    mutationFn: searchForPlayer,
    retry: 1,
  })
}

export const useSearchLeaderboard = () => {
  return useMutation({
    mutationFn: (payload: { type: LeaderboardType; activityId: string; playerName: string }) =>
      searchLeaderboard(payload.activityId, payload.type, payload.playerName),
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

export type LeaderboardType = 'completions' | 'speed' | 'score'
export interface BaseLeaderboardEntry {
  player: PlayerDTO
}

export const useLeaderboard = (
  typeRef: Ref<LeaderboardType>,
  activityId: string | Ref<string>,
  count: number | Ref<number>,
  offset: number | Ref<number>,
) => {
  return useQuery<{ player: PlayerDTO; data: string; rank: number }[]>({
    queryKey: ['leaderboard', typeRef, activityId, count, offset],
    queryFn: async () => {
      const t = unref(typeRef)
      const id = unref(activityId)
      if (id === undefined || id === null || id === '') return []
      const data = await getLeaderboard(id, t, unref(count), unref(offset))
      return data.map((entry) => ({
        player: entry.player,
        data: entry.data,
        rank: entry.rank,
      }))
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
