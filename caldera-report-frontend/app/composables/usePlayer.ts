import { api as bungieApi } from "../../api/bungie/client";
import { api as internalApi } from "../../api/internal/client";

export function usePlayer(playerId: string, membershipType: number) {
  const player = useAsyncData(`player:${playerId}`, () =>
    internalApi.GET("/api/Players/{playerId}", {
      params: { path: { playerId: Number(playerId) } },
    })
  );

  const bungieProfile = useAsyncData(`bungieProfile:${playerId}`, () =>
    bungieApi.GET(`/Destiny2/{membershipType}/Profile/{destinyMembershipId}/`, {
      params: {
        path: {
          membershipType: membershipType,
          destinyMembershipId: Number(playerId),
        },
        query: { components: [100, 200] },
      },
    })
  );
  return { player, bungieProfile };
}
