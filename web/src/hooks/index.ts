import { fetchPlayers, searchForPlayer } from '@/api/api/caldera-report-api'
import type { Player } from '@/api/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

export const usePlayers = () => {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: fetchPlayers,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export const useSearchPlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: searchForPlayer,
    onSuccess: (data) => {
      queryClient.setQueryData<Player[]>(['players'], (old = []) => {
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
