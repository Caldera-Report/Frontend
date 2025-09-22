import type { HttpClient, HttpClientConfig } from 'bungie-api-ts/http'
import {
  getDestinyManifest,
  getDestinyManifestComponent,
  getPostGameCarnageReport,
  type DestinyManifest,
} from 'bungie-api-ts/destiny2'
import { getGroupsForMember } from 'bungie-api-ts/groupv2'

const API_KEY = import.meta.env.VITE_BUNGIE_API_KEY
const CONCURRENCY = 20 //I think this is the max allowed by bungie. Realistically a user should never hit this.
if (!API_KEY) {
  throw new Error('BUNGIE_API_KEY is not set')
}
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
    const url = new URL(config.url)
    if (config.params) {
      for (const [k, v] of Object.entries(config.params)) {
        url.searchParams.set(k, v)
      }
    }

    const isPlatformEndpoint = url.pathname.startsWith('/Platform/')

    const headers: Record<string, string> = {}
    if (isPlatformEndpoint) {
      headers['X-API-Key'] = API_KEY
    }
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

export function getClanForUser(membershipId: string, membershipType: number) {
  return getGroupsForMember(bungieHttp, {
    groupType: 1,
    filter: 0,
    membershipId,
    membershipType,
  })
}

const MANIFEST_STORAGE_KEY = 'bungie_manifest'
const MANIFEST_MAX_AGE_MS = 1 * 60 * 60 * 1000 // 1 hour

interface StoredManifestRecord {
  storedAt: number
  manifest: DestinyManifest
}

let manifestPromise: Promise<DestinyManifest> | null = null
let inMemoryManifest: DestinyManifest | null = null

function loadStoredManifest(): DestinyManifest | null {
  try {
    const raw = localStorage.getItem(MANIFEST_STORAGE_KEY)
    if (!raw) return null
    const parsed: StoredManifestRecord = JSON.parse(raw)
    if (!parsed.manifest || !parsed.storedAt) return null
    if (Date.now() - parsed.storedAt < MANIFEST_MAX_AGE_MS) {
      return parsed.manifest
    }
    return parsed.manifest
  } catch {
    return null
  }
}

function persistManifest(manifest: DestinyManifest) {
  const record: StoredManifestRecord = { storedAt: Date.now(), manifest }
  try {
    localStorage.setItem(MANIFEST_STORAGE_KEY, JSON.stringify(record))
  } catch {}
}

async function fetchManifestNetwork(): Promise<DestinyManifest> {
  const resp = await getDestinyManifest(bungieHttp)
  const m = resp.Response
  persistManifest(m)
  inMemoryManifest = m
  return m
}

export async function getCachedManifest(options?: {
  forceRefresh?: boolean
}): Promise<DestinyManifest> {
  if (options?.forceRefresh) {
    if (!manifestPromise)
      manifestPromise = fetchManifestNetwork().finally(() => (manifestPromise = null))
    return manifestPromise
  }

  if (inMemoryManifest) return inMemoryManifest

  const stored = loadStoredManifest()
  if (stored) {
    inMemoryManifest = stored
    const recordRaw = localStorage.getItem(MANIFEST_STORAGE_KEY)
    if (recordRaw) {
      try {
        const rec: StoredManifestRecord = JSON.parse(recordRaw)
        const isStale = Date.now() - rec.storedAt >= MANIFEST_MAX_AGE_MS
        if (isStale && !manifestPromise) {
          manifestPromise = fetchManifestNetwork().finally(() => (manifestPromise = null))
        }
      } catch {}
    }
    return stored
  }

  if (!manifestPromise)
    manifestPromise = fetchManifestNetwork().finally(() => (manifestPromise = null))
  return manifestPromise
}

export function getActivitiesBungie() {
  const manifest = getCachedManifest()
  return manifest.then((m) =>
    getDestinyManifestComponent(bungieHttp, {
      destinyManifest: m,
      tableName: 'DestinyActivityDefinition',
      language: 'en',
    }),
  )
}
