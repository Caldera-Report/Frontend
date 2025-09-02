/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly BUNGIE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
