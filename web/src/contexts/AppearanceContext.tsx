import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { getAppearanceSettings, type AppearanceSettings } from '../api/appearance'

export const FONT_PRESET_OPTIONS = [
  { id: 'iosevka_charon_mono', label: 'Iosevka Charon Mono' },
  { id: 'jetbrains_mono', label: 'JetBrains Mono' },
  { id: 'source_code_pro', label: 'Source Code Pro' },
  { id: 'inter', label: 'Inter' },
  { id: 'roboto', label: 'Roboto' },
  { id: 'open_sans', label: 'Open Sans' },
  { id: 'lato', label: 'Lato' },
  { id: 'source_sans_3', label: 'Source Sans 3' },
  { id: 'ibm_plex_sans', label: 'IBM Plex Sans' },
  { id: 'system_ui', label: 'System UI' },
  { id: 'georgia', label: 'Georgia (system serif)' },
  { id: 'merriweather', label: 'Merriweather' },
] as const

export function applyAppearanceToDocument(cssFamily: string, sizePx: number) {
  const root = document.documentElement
  root.style.setProperty('--font', cssFamily)
  root.style.setProperty('--font-mono', cssFamily)
  root.style.setProperty('--app-root-font-size', `${sizePx}px`)
}

export function clearAppearanceInlineStyles() {
  const root = document.documentElement
  root.style.removeProperty('--font')
  root.style.removeProperty('--font-mono')
  root.style.removeProperty('--app-root-font-size')
}

type AppearanceContextValue = {
  appearance: AppearanceSettings | null
  loading: boolean
  refreshAppearance: () => Promise<void>
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { getToken, user } = useAuth()
  const [appearance, setAppearance] = useState<AppearanceSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshAppearance = useCallback(async () => {
    const token = getToken()
    if (!token || !user?.account) {
      clearAppearanceInlineStyles()
      setAppearance(null)
      return
    }
    setLoading(true)
    try {
      const data = await getAppearanceSettings(token)
      setAppearance(data)
      applyAppearanceToDocument(data.font_family_css, data.font_size_px)
    } catch {
      clearAppearanceInlineStyles()
      setAppearance(null)
    } finally {
      setLoading(false)
    }
  }, [getToken, user?.account])

  useEffect(() => {
    void refreshAppearance()
  }, [refreshAppearance])

  const value = useMemo(
    () => ({
      appearance,
      loading,
      refreshAppearance,
    }),
    [appearance, loading, refreshAppearance],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}
