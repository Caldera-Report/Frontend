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
import { getPGCR, getSkullHashes } from '@/api/http/bungieClient'
import type { ActivityReportDTO, OpTypeDTO, PlayerDTO } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type {
  DestinyActivitySelectableSkullCollectionDefinition,
  DestinyActivitySkull,
  DestinyPostGameCarnageReportData,
} from 'bungie-api-ts/destiny2'
import { unref, type Ref } from 'vue'

export const usePlayers = () => {
  return useQuery<PlayerDTO[]>({
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
      queryClient.setQueryData<PlayerDTO[]>(['players'], (old = []) => {
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

export const usePlayer = (membershipId: string, membershipType: number) => {
  return useQuery<PlayerDTO>({
    queryKey: ['player', membershipType, membershipId],
    queryFn: () => getPlayer(membershipId, membershipType),
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
  return useQuery<ActivityReportDTO[]>({
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
  return useQuery<
    {
      player: PlayerDTO
      completions: number
    }[]
  >({
    queryKey: ['completionsLeaderboard', unref(activityId)],
    queryFn: () => getCompletionsLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export const useBestTimesLeaderboard = (activityId: string | Ref<string>) => {
  return useQuery<
    {
      player: PlayerDTO
      time: string
    }[]
  >({
    queryKey: ['bestTimesLeaderboard', unref(activityId)],
    queryFn: () => getBestTimesLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export const useTotalTimeLeaderboard = (activityId: string | Ref<string>) => {
  return useQuery<
    {
      player: PlayerDTO
      time: string
    }[]
  >({
    queryKey: ['totalTimeLeaderboard', unref(activityId)],
    queryFn: () => getTotalTimeLeaderboard(unref(activityId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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

export const useSkullHashes = () => {
  return useQuery<DestinyActivitySelectableSkullCollectionDefinition[]>({
    queryKey: ['skullHashes'],
    queryFn: async () => {
      const response = await getSkullHashes()
      return Object.values(response) as DestinyActivitySelectableSkullCollectionDefinition[]
    },
    staleTime: 'static',
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
