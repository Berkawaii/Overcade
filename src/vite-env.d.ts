/// <reference types="vite/client" />

declare module 'virtual:chrono-audio' {
  export const AVAILABLE_CHRONO_TRACKS: Record<string, string>;
  export const AVAILABLE_CHRONO_SFX: Record<string, string>;
}

declare module 'virtual:vortex-audio' {
  export const AVAILABLE_VORTEX_TRACKS: Record<string, string>;
  export const AVAILABLE_VORTEX_SFX: Record<string, string>;
}
