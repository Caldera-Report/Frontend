import type { HttpClient, HttpClientConfig } from 'bungie-api-ts/http'
import { getPostGameCarnageReport } from 'bungie-api-ts/destiny2'

const API_KEY = import.meta.env.VITE_BUNGIE_API_KEY
const CONCURRENCY = 4
let active = 0
const queue: (() => void)[] = []
function schedule<T>(fn: () => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--
          queue.shift()?.()
        })
    }
    if (active < CONCURRENCY) run()
    else queue.push(run)
  })
}

export const bungieHttp: HttpClient = async <T>(config: HttpClientConfig): Promise<T> => {
  return schedule(async () => {
    const url = new URL(`https://www.bungie.net${config.url}`)
    if (config.params) {
      for (const [k, v] of Object.entries(config.params)) {
        url.searchParams.set(k, v)
      }
    }
    const headers: Record<string, string> = { 'X-API-Key': String(API_KEY) }
    if (config.method === 'POST') headers['Content-Type'] = 'application/json'
    const res = await fetch(url.toString(), {
      method: config.method,
      headers,
      body:
        config.method === 'POST' && config.body !== undefined
          ? JSON.stringify(config.body)
          : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bungie API ${res.status}: ${text}`)
    }
    return (await res.json()) as T
  })
}

export function getPGCR(instanceId: string) {
  return getPostGameCarnageReport(bungieHttp, { activityId: instanceId })
}
