import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useAppearance, FONT_PRESET_OPTIONS, applyAppearanceToDocument } from '../../contexts/AppearanceContext'
import { patchAppearanceSettings } from '../../api/appearance'

const FONT_SCALE_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'Dense information layout' },
  { id: 'comfortable', label: 'Comfortable', desc: 'Balanced readability' },
  { id: 'spacious', label: 'Spacious', desc: 'Large hierarchy and rhythm' },
] as const

const WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800] as const
const FONT_PRESET_CSS = {
  iosevka_charon_mono: "'Iosevka Charon Mono', ui-monospace, 'Cascadia Code', monospace",
  plus_jakarta_sans: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  jetbrains_mono: "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace",
  source_code_pro: "'Source Code Pro', ui-monospace, 'Cascadia Code', monospace",
  inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  roboto: "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  open_sans: "'Open Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  lato: "'Lato', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  source_sans_3: "'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  ibm_plex_sans: "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system_ui: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  georgia: "Georgia, 'Times New Roman', Times, serif",
  merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
} as const
type FontPresetId = keyof typeof FONT_PRESET_CSS

function toFontPresetId(raw: string): FontPresetId {
  if (raw in FONT_PRESET_CSS) return raw as FontPresetId
  return 'inter'
}

export default function AppearanceSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const { appearance, refreshAppearance } = useAppearance()
  const token = getToken()

  const [uiPreset, setUiPreset] = useState<FontPresetId>('inter')
  const [headingPreset, setHeadingPreset] = useState<FontPresetId>('plus_jakarta_sans')
  const [bodyPreset, setBodyPreset] = useState<FontPresetId>('inter')
  const [monoPreset, setMonoPreset] = useState<FontPresetId>('jetbrains_mono')
  const [contentPreset, setContentPreset] = useState<FontPresetId>('inter')
  const [sizePx, setSizePx] = useState(14)
  const [scalePreset, setScalePreset] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')
  const [lineHeight, setLineHeight] = useState(1.55)
  const [letterSpacingEm, setLetterSpacingEm] = useState(0)
  const [weightRegular, setWeightRegular] = useState(400)
  const [weightMedium, setWeightMedium] = useState(500)
  const [weightBold, setWeightBold] = useState(700)
  const [readabilityMode, setReadabilityMode] = useState(false)
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (appearance) {
      setUiPreset(toFontPresetId(appearance.ui_font_preset))
      setHeadingPreset(toFontPresetId(appearance.heading_font_preset))
      setBodyPreset(toFontPresetId(appearance.body_font_preset))
      setMonoPreset(toFontPresetId(appearance.mono_font_preset))
      setContentPreset(toFontPresetId(appearance.content_font_preset))
      setSizePx(appearance.font_size_px)
      setScalePreset(appearance.font_scale_preset)
      setLineHeight(appearance.line_height)
      setLetterSpacingEm(appearance.letter_spacing_em)
      setWeightRegular(appearance.weight_regular)
      setWeightMedium(appearance.weight_medium)
      setWeightBold(appearance.weight_bold)
      setReadabilityMode(appearance.readability_mode)
      setHighContrastMode(appearance.high_contrast_mode)
    }
  }, [appearance])

  const preview = useMemo(() => {
    const fontById = new Map(FONT_PRESET_OPTIONS.map(x => [x.id, x.label]))
    const ratio = scalePreset === 'compact' ? 1.2 : scalePreset === 'spacious' ? 1.33 : 1.25
    return {
      ratio,
      uiLabel: fontById.get(uiPreset) ?? uiPreset,
      headingLabel: fontById.get(headingPreset) ?? headingPreset,
      bodyLabel: fontById.get(bodyPreset) ?? bodyPreset,
      monoLabel: fontById.get(monoPreset) ?? monoPreset,
      contentLabel: fontById.get(contentPreset) ?? contentPreset,
    }
  }, [uiPreset, headingPreset, bodyPreset, monoPreset, contentPreset, scalePreset])

  async function save() {
    if (!token || !Number.isFinite(accountId)) return
    setSaving(true)
    try {
      const updated = await patchAppearanceSettings(token, accountId, {
        font_preset: uiPreset,
        ui_font_preset: uiPreset,
        heading_font_preset: headingPreset,
        body_font_preset: bodyPreset,
        mono_font_preset: monoPreset,
        content_font_preset: contentPreset,
        font_size_px: sizePx,
        font_scale_preset: scalePreset,
        line_height: lineHeight,
        letter_spacing_em: letterSpacingEm,
        weight_regular: weightRegular,
        weight_medium: weightMedium,
        weight_bold: weightBold,
        readability_mode: readabilityMode,
        high_contrast_mode: highContrastMode,
      })
      applyAppearanceToDocument(updated)
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
        Typography as a workspace design system. Configure role-based fonts, rhythm, scale, and readability settings
        for candidate lists, pipeline cards, forms, and content-heavy views.
      </p>

      <div className="settings-org-toolbar">
        <h2 className="settings-org-title">Typography and Design Previews</h2>
        <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="settings-appearance-layout">
        <div className="settings-appearance-left">
          <div className="settings-org-section">
            <h3 className="settings-org-section-title">Font roles</h3>
            <p className="settings-field-hint">Apply different fonts by UI role for better readability and branding.</p>
            <div className="settings-appearance-grid">
              <div className="esign-field-block">
                <label htmlFor="app-font-ui">UI font</label>
                <select id="app-font-ui" className="esign-pro-input" value={uiPreset} onChange={e => setUiPreset(toFontPresetId(e.target.value))}>
                  {FONT_PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-font-heading">Heading font</label>
                <select id="app-font-heading" className="esign-pro-input" value={headingPreset} onChange={e => setHeadingPreset(toFontPresetId(e.target.value))}>
                  {FONT_PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-font-body">Body font</label>
                <select id="app-font-body" className="esign-pro-input" value={bodyPreset} onChange={e => setBodyPreset(toFontPresetId(e.target.value))}>
                  {FONT_PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-font-content">Content font</label>
                <select id="app-font-content" className="esign-pro-input" value={contentPreset} onChange={e => setContentPreset(toFontPresetId(e.target.value))}>
                  {FONT_PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="esign-field-block settings-org-field--wide">
                <label htmlFor="app-font-mono">Monospace font (logs, parsing, AI)</label>
                <select id="app-font-mono" className="esign-pro-input" value={monoPreset} onChange={e => setMonoPreset(toFontPresetId(e.target.value))}>
                  {FONT_PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="settings-org-section">
            <h3 className="settings-org-section-title">Scale and rhythm</h3>
            <div className="settings-appearance-grid">
              <div className="esign-field-block settings-org-field--wide">
                <label>Scale preset</label>
                <div className="settings-appearance-segmented">
                  {FONT_SCALE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`settings-appearance-segment${scalePreset === opt.id ? ' is-active' : ''}`}
                      onClick={() => setScalePreset(opt.id)}
                    >
                      <span>{opt.label}</span>
                      <small>{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-font-size">Base font size (px)</label>
                <input id="app-font-size" type="number" className="esign-pro-input" min={12} max={22} step={1} value={sizePx} onChange={e => setSizePx(Number(e.target.value) || 15)} />
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-line-height">Line height</label>
                <input id="app-line-height" type="number" className="esign-pro-input" min={1.2} max={2} step={0.05} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value) || 1.6)} />
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-letter-spacing">Letter spacing (em)</label>
                <input id="app-letter-spacing" type="number" className="esign-pro-input" min={-0.02} max={0.08} step={0.005} value={letterSpacingEm} onChange={e => setLetterSpacingEm(Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div className="settings-org-section">
            <h3 className="settings-org-section-title">Weight and accessibility</h3>
            <div className="settings-appearance-grid">
              <div className="esign-field-block">
                <label htmlFor="app-weight-regular">Regular weight</label>
                <select id="app-weight-regular" className="esign-pro-input" value={weightRegular} onChange={e => setWeightRegular(Number(e.target.value))}>
                  {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-weight-medium">Medium weight</label>
                <select id="app-weight-medium" className="esign-pro-input" value={weightMedium} onChange={e => setWeightMedium(Number(e.target.value))}>
                  {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="app-weight-bold">Bold weight</label>
                <select id="app-weight-bold" className="esign-pro-input" value={weightBold} onChange={e => setWeightBold(Number(e.target.value))}>
                  {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="esign-field-block">
                <label className="settings-appearance-toggle">
                  <input type="checkbox" checked={readabilityMode} onChange={e => setReadabilityMode(e.target.checked)} />
                  <span>Increase readability</span>
                </label>
              </div>
              <div className="esign-field-block">
                <label className="settings-appearance-toggle">
                  <input type="checkbox" checked={highContrastMode} onChange={e => setHighContrastMode(e.target.checked)} />
                  <span>High contrast mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-appearance-preview">
          <h3 className="settings-org-section-title">Live preview</h3>
          <p className="settings-field-hint">Candidate card, pipeline list and content sample with current settings.</p>
          <div
            className={`settings-appearance-preview-card${highContrastMode ? ' is-contrast' : ''}${readabilityMode ? ' is-readable' : ''}`}
            style={
              {
                '--preview-size': `${sizePx}px`,
                '--preview-ratio': preview.ratio,
                '--preview-line-height': lineHeight,
                '--preview-letter-spacing': `${letterSpacingEm}em`,
                '--preview-weight-regular': weightRegular,
                '--preview-weight-medium': weightMedium,
                '--preview-weight-bold': weightBold,
                '--preview-ui-family': FONT_PRESET_CSS[uiPreset],
                '--preview-heading-family': FONT_PRESET_CSS[headingPreset],
                '--preview-body-family': FONT_PRESET_CSS[bodyPreset],
                '--preview-content-family': FONT_PRESET_CSS[contentPreset],
                '--preview-mono-family': FONT_PRESET_CSS[monoPreset],
              } as CSSProperties
            }
          >
            <h4 className="settings-appearance-preview-title">Senior Backend Engineer</h4>
            <p className="settings-appearance-preview-subtitle">Apex Corp · Remote · Full-time</p>
            <div className="settings-appearance-preview-tags">
              <span>Pipeline</span>
              <span>Interview</span>
              <span>Offer</span>
            </div>
            <p className="settings-appearance-preview-body">
              Candidate profile text and notes area. This simulates job descriptions, scorecard narratives, and candidate communication content.
            </p>
            <code className="settings-appearance-preview-code">ai_score=0.84 · parse_time=132ms · source=LinkedIn</code>
            <div className="settings-appearance-preview-meta">
              <span>UI: {preview.uiLabel}</span>
              <span>Heading: {preview.headingLabel}</span>
              <span>Body: {preview.bodyLabel}</span>
              <span>Content: {preview.contentLabel}</span>
              <span>Mono: {preview.monoLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
