/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  /** When `"true"`, partnership UI uses local dummy data instead of `/partnerships/v1` on the API. */
  readonly VITE_PARTNERSHIPS_USE_DUMMY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
