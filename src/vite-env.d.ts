/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LIVE_API?: string;
  readonly VITE_EXECUTION_SRV_PORT?: string;
  readonly VITE_EXECUTION_SRV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
