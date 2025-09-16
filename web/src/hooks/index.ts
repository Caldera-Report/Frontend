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
import type { ActivityReportDTO, OpTypeDTO, PlayerDTO } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
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
