import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useAppearance, FONT_PRESET_OPTIONS, applyAppearanceToDocument } from '../../contexts/AppearanceContext'
import { patchAppearanceSettings } from '../../api/appearance'

export default function AppearanceSettingsPage() {
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const { appearance, refreshAppearance } = useAppearance()
  const token = getToken()

  const [preset, setPreset] = useState('iosevka_charon_mono')
  const [sizePx, setSizePx] = useState(15)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (appearance) {
      setPreset(appearance.font_preset)
      setSizePx(appearance.font_size_px)
    }
  }, [appearance])

  async function save() {
    if (!token) return
    setSaving(true)
    try {
      const updated = await patchAppearanceSettings(token, {
        font_preset: preset,
        font_size_px: sizePx,
      })
      applyAppearanceToDocument(updated.font_family_css, updated.font_size_px)
      await refreshAppearance()
      success('Saved', 'Typography updated for everyone in this workspace.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-org-page settings-appearance-page">
      <p className="settings-lead">
        Workspace-wide typeface and base size. Default is{' '}
        <a href="https://fonts.google.com/specimen/Iosevka+Charon+Mono" target="_blank" rel="noreferrer">
          Iosevka Charon Mono
        </a>{' '}
        from Google Fonts. Web-font presets (sans, mono, and Merriweather) are preloaded; System UI and Georgia use your device fonts.
      </p>

      <div className="settings-org-toolbar">
        <h2 className="settings-org-title">Typography</h2>
        <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="settings-appearance-grid">
        <div className="esign-field-block">
          <label htmlFor="app-font-preset">Font family</label>
          <select
            id="app-font-preset"
            className="esign-pro-input"
            value={preset}
            onChange={e => setPreset(e.target.value)}
          >
            {FONT_PRESET_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="settings-field-hint">
            UI and monospace areas both use the same stack so the app stays visually consistent.
          </p>
        </div>

        <div className="esign-field-block">
          <label htmlFor="app-font-size">Base font size (px)</label>
          <input
            id="app-font-size"
            type="number"
            className="esign-pro-input"
            min={12}
            max={22}
            step={1}
            value={sizePx}
            onChange={e => setSizePx(Number(e.target.value) || 15)}
          />
          <p className="settings-field-hint settings-field-hint--emphasis">
            Sets the root size (12–22px). Relative sizes across the app scale with this value.
          </p>
        </div>
      </div>
    </div>
  )
}
