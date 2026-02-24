import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  language: 'en' | 'vi' | 'zh'
  theme: 'light' | 'dark' | 'auto'
  startOnBoot: boolean
  minimizeToTray: boolean
  checkForUpdates: boolean
  defaultSaveFolder: string
  maxConcurrentDownloads: number
  defaultThreadCount: number
  defaultSpeedLimit?: number
  autoMerge: boolean
  deleteTempFiles: boolean
  openFolderWhenComplete: boolean
  ffmpegPath?: string
  proxy?: any
  requestTimeout: number
  retryCount: number
  enableClipboardMonitor: boolean
  logLevel: string
  historyRetentionDays: number
  autoCleanHistory: boolean
}

const defaultSettings: Settings = {
  language: 'en',
  theme: 'auto',
  startOnBoot: false,
  minimizeToTray: true,
  checkForUpdates: true,
  defaultSaveFolder: '',
  maxConcurrentDownloads: 3,
  defaultThreadCount: 8,
  defaultSpeedLimit: undefined,
  autoMerge: true,
  deleteTempFiles: true,
  openFolderWhenComplete: false,
  ffmpegPath: undefined,
  proxy: undefined,
  requestTimeout: 30,
  retryCount: 3,
  enableClipboardMonitor: false,
  logLevel: 'info',
  historyRetentionDays: 30,
  autoCleanHistory: false,
}

interface SettingsStore {
  settings: Settings
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  resetSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      loadSettings: async () => {
        try {
          const settings = await window.electronAPI.settingsGet()
          set({ settings: { ...defaultSettings, ...settings } })
        } catch (error) {
          console.error('Failed to load settings:', error)
          set({ settings: defaultSettings })
        }
      },

      updateSettings: async (newSettings: Partial<Settings>) => {
        await window.electronAPI.settingsSave(newSettings)
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      resetSettings: async () => {
        await window.electronAPI.settingsReset()
        set({ settings: defaultSettings })
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
