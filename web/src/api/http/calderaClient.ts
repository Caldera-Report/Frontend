import { http, type RequestOptions } from './httpClient'

const RAW_BASE = import.meta.env.VITE_CALDERA_API_BASE ?? 'http://localhost:5000'
const BASE_URL = RAW_BASE.replace(/\/$/, '')

function join(path: string) {
  if (!path.startsWith('/')) path = '/' + path
  return BASE_URL + path
}

export function calderaGet<T>(path: string, init?: RequestOptions) {
  return http<T>(join(path), { ...init, method: 'GET' })
}

export function calderaPost<T>(path: string, json?: unknown, init?: RequestOptions) {
  return http<T>(join(path), { ...init, method: 'POST', json })
}

export function calderaPut<T>(path: string, json?: unknown, init?: RequestOptions) {
  return http<T>(join(path), { ...init, method: 'PUT', json })
}

export function calderaDelete<T>(path: string, init?: RequestOptions) {
  return http<T>(join(path), { ...init, method: 'DELETE' })
}
