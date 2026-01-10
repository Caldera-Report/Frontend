import type { paths } from "./openapi";
import createClient from "openapi-fetch";

export const api = createClient<paths>({
  baseUrl:
    import.meta.env.VITE_INTERNAL_API_BASE_URL || "http://localhost:5207",
});
