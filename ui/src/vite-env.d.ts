/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRIDGE_URL?: string
  readonly VITE_BRIDGE_TOKEN?: string
  readonly VITE_STS2_WS_URL?: string
  readonly VITE_MOCK?: string
  readonly VITE_BILIBILI_ROOM_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
