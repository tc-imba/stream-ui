import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  fontScale: number
  showTimestamps: boolean
  showAvatars: boolean
  fadeOutMs: number
  setFontScale: (n: number) => void
  toggleTimestamps: () => void
  toggleAvatars: () => void
  setFadeOutMs: (n: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      fontScale: 1,
      showTimestamps: false,
      showAvatars: false,
      fadeOutMs: 0,
      setFontScale: n => set({ fontScale: n }),
      toggleTimestamps: () =>
        set(s => ({ showTimestamps: !s.showTimestamps })),
      toggleAvatars: () => set(s => ({ showAvatars: !s.showAvatars })),
      setFadeOutMs: n => set({ fadeOutMs: n }),
    }),
    { name: 'stream-ui:settings' },
  ),
)
