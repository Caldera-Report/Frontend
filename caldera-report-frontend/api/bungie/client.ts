import type { paths } from "./openapi";
import createClient from "openapi-fetch";

export const api = createClient<paths>({
  baseUrl: "https://www.bungie.net/Platform",
  headers: {
    "X-API-Key": import.meta.env.VITE_BUNGIE_API_KEY || "",
  },
});
