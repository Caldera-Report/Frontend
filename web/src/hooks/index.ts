import {
  fetchPlayers,
  getActivities,
  getPlayer,
  GetPlayerReportsForActivity,
  searchForPlayer,
} from '@/api/api/caldera-report-api'
import type { ActivityReportDTO, OpTypeDTO, PlayerDTO } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

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

export const usePlayerReportsForActivity = (playerId: string, activityId: string) => {
  return useQuery<ActivityReportDTO[]>({
    queryKey: ['playerReports', playerId, activityId],
    queryFn: () => GetPlayerReportsForActivity(playerId, activityId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
