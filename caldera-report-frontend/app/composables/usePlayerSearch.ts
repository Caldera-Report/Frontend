import { api } from "../../api/internal/client";

export function usePlayerSearch(query: string) {
  return useAsyncData(`playerSearch:${query}`, () =>
    api.POST("/api/Players/search", {
      body: { playerName: query },
    })
  );
}
