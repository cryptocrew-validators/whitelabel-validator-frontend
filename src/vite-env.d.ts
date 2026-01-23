/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
  readonly GITHUB_PAGES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
