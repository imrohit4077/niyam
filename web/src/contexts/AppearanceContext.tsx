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
  { id: 'inter', label: 'Inter (default)' },
  { id: 'plus_jakarta_sans', label: 'Plus Jakarta Sans' },
  { id: 'iosevka_charon_mono', label: 'Iosevka Charon Mono' },
  { id: 'jetbrains_mono', label: 'JetBrains Mono' },
  { id: 'source_code_pro', label: 'Source Code Pro' },
  { id: 'roboto', label: 'Roboto' },
  { id: 'open_sans', label: 'Open Sans' },
  { id: 'lato', label: 'Lato' },
  { id: 'source_sans_3', label: 'Source Sans 3' },
  { id: 'ibm_plex_sans', label: 'IBM Plex Sans' },
  { id: 'system_ui', label: 'System UI' },
  { id: 'georgia', label: 'Georgia (system serif)' },
  { id: 'merriweather', label: 'Merriweather' },
] as const

function ratioForScalePreset(scalePreset: AppearanceSettings['font_scale_preset']): number {
  if (scalePreset === 'compact') return 1.2
  if (scalePreset === 'spacious') return 1.33
  return 1.25
}

export function applyAppearanceToDocument(appearance: AppearanceSettings) {
  const root = document.documentElement
  root.style.setProperty('--font', appearance.ui_font_family_css || appearance.font_family_css)
  root.style.setProperty('--font-ui', appearance.ui_font_family_css || appearance.font_family_css)
  root.style.setProperty('--font-body', appearance.body_font_family_css || appearance.font_family_css)
  root.style.setProperty('--font-heading', appearance.heading_font_family_css || appearance.font_family_css)
  root.style.setProperty('--font-content', appearance.content_font_family_css || appearance.font_family_css)
  root.style.setProperty('--font-mono', appearance.mono_font_family_css || appearance.font_family_css)
  root.style.setProperty('--app-root-font-size', `${appearance.font_size_px}px`)
  root.style.setProperty('--app-line-height', String(appearance.line_height))
  root.style.setProperty('--app-letter-spacing-em', `${appearance.letter_spacing_em}em`)
  root.style.setProperty('--app-font-scale-ratio', String(ratioForScalePreset(appearance.font_scale_preset)))
  root.style.setProperty('--app-weight-regular', String(appearance.weight_regular))
  root.style.setProperty('--app-weight-medium', String(appearance.weight_medium))
  root.style.setProperty('--app-weight-bold', String(appearance.weight_bold))
  root.style.setProperty('--app-readable-contrast', appearance.high_contrast_mode ? '1' : '0')
  root.style.setProperty('--app-readable-mode', appearance.readability_mode ? '1' : '0')
}

export function clearAppearanceInlineStyles() {
  const root = document.documentElement
  const vars = [
    '--font',
    '--font-ui',
    '--font-body',
    '--font-heading',
    '--font-content',
    '--font-mono',
    '--app-root-font-size',
    '--app-line-height',
    '--app-letter-spacing-em',
    '--app-font-scale-ratio',
    '--app-weight-regular',
    '--app-weight-medium',
    '--app-weight-bold',
    '--app-readable-contrast',
    '--app-readable-mode',
  ]
  for (const name of vars) root.style.removeProperty(name)
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
      const data = await getAppearanceSettings(token, user.account.id)
      setAppearance(data)
      applyAppearanceToDocument(data)
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
