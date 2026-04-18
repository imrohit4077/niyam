import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  getOrganizationSettings,
  patchOrganizationSettings,
  type JobSetupCatalogField,
  type JobSetupCatalogSection,
  type OrganizationSettings,
} from '../../api/accountOrganization'
import {
  createJobSetupField,
  createJobSetupSection,
  destroyJobSetupField,
  destroyJobSetupSection,
  updateJobSetupField,
  updateJobSetupSection,
} from '../../api/jobSetupFlow'
import { customAttributesApi, type CustomAttributeDefinition } from '../../api/customAttributes'
import {
  DEFAULT_JOB_SETUP_FIELDS_BY_SECTION,
  DEFAULT_ENABLED_JOB_SETUP_SECTIONS,
} from '../../constants/jobSetupSections'

function normalize(row: OrganizationSettings): OrganizationSettings {
  const catalog = Array.isArray(row.job_setup_catalog) ? row.job_setup_catalog : []
  const catalogSectionIds = catalog.map(s => s.id)
  const defaultEnabled =
    catalogSectionIds.length > 0
      ? catalog.filter(s => s.is_enabled !== false).map(s => s.id)
      : DEFAULT_ENABLED_JOB_SETUP_SECTIONS
  const enabled =
    Array.isArray(row.enabled_job_setup_sections) && row.enabled_job_setup_sections.length
      ? row.enabled_job_setup_sections
      : defaultEnabled.length
        ? defaultEnabled
        : DEFAULT_ENABLED_JOB_SETUP_SECTIONS
  const enabledFields: Record<string, string[]> = {}
  for (const section of catalog) {
    const sectionId = section.id
    const defaultFieldIds = section.fields.map(field => field.id)
    const current = row.enabled_job_setup_fields?.[sectionId]
    enabledFields[sectionId] = Array.isArray(current) && current.length ? current : defaultFieldIds
  }
  return { ...row, enabled_job_setup_sections: enabled, enabled_job_setup_fields: enabledFields }
}

export default function JobSetupSectionsSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationSettings | null>(null)
  const [jobCustomDefs, setJobCustomDefs] = useState<CustomAttributeDefinition[]>([])
  const [addingForSectionId, setAddingForSectionId] = useState<string | null>(null)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomAttributeDefinition['field_type']>('text')
  const [creatingField, setCreatingField] = useState(false)

  const [newSectionLabel, setNewSectionLabel] = useState('')
  const [creatingSection, setCreatingSection] = useState(false)
  const [editingSectionDbId, setEditingSectionDbId] = useState<number | null>(null)
  const [draftSectionLabel, setDraftSectionLabel] = useState('')
  const [editingFieldDbId, setEditingFieldDbId] = useState<number | null>(null)
  const [draftFieldLabel, setDraftFieldLabel] = useState('')

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(accountId)) return
    setLoading(true)
    try {
      const row = await getOrganizationSettings(token, accountId)
      const defs = await customAttributesApi.list(token, 'job', accountId)
      setForm(normalize(row))
      setJobCustomDefs(defs)
    } catch (e) {
      showError('Could not load job setup sections', e instanceof Error ? e.message : undefined)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [token, accountId, showError])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(() => new Set(form?.enabled_job_setup_sections ?? []), [form?.enabled_job_setup_sections])

  const catalogSections = useMemo(() => form?.job_setup_catalog ?? [], [form?.job_setup_catalog])
  const enabledSectionCount = form?.enabled_job_setup_sections?.length ?? 0
  const totalSectionCount = catalogSections.length
  const totalCustomFieldCount = useMemo(
    () =>
      Object.values(form?.enabled_job_setup_fields ?? {}).reduce(
        (sum, ids) => sum + ids.filter(id => id.startsWith('custom:')).length,
        0,
      ),
    [form?.enabled_job_setup_fields],
  )

  function toggleSection(sectionId: string, enabled: boolean) {
    if (!form) return
    const next = new Set(form.enabled_job_setup_sections)
    if (enabled) next.add(sectionId)
    else next.delete(sectionId)
    const ordered = catalogSections.map(s => s.id).filter(id => next.has(id))
    setForm({
      ...form,
      enabled_job_setup_sections: ordered.length ? ordered : catalogSections.map(s => s.id),
    })
  }

  function toggleField(sectionId: string, fieldId: string, enabled: boolean) {
    if (!form) return
    const section = catalogSections.find(s => s.id === sectionId)
    if (!section) return
    const defaultIds = section.fields.map(f => f.id)
    const currentIds = form.enabled_job_setup_fields?.[sectionId] ?? defaultIds
    const next = new Set(currentIds)
    if (enabled) next.add(fieldId)
    else next.delete(fieldId)
    const customInOrder = [
      ...currentIds.filter(id => id.startsWith('custom:') && next.has(id)),
      ...Array.from(next).filter(id => id.startsWith('custom:') && !currentIds.includes(id)),
    ]
    const ordered = [...defaultIds.filter(id => next.has(id)), ...customInOrder]
    setForm({
      ...form,
      enabled_job_setup_fields: {
        ...form.enabled_job_setup_fields,
        [sectionId]: ordered.length ? ordered : [...defaultIds],
      },
    })
  }

  function slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
  }

  async function addCustomField(section: JobSetupCatalogSection) {
    if (!token || !form || !newFieldLabel.trim()) return
    const base = slugify(newFieldLabel) || 'custom_field'
    const suffix = Date.now().toString().slice(-6)
    const attributeKey = `${base}_${suffix}`
    setCreatingField(true)
    try {
      const created = await customAttributesApi.create(token, accountId, {
        entity_type: 'job',
        attribute_key: attributeKey,
        label: newFieldLabel.trim(),
        field_type: newFieldType,
      })
      setJobCustomDefs(prev => [...prev, created])
      const tokenId = `custom:${created.attribute_key}`
      await createJobSetupField(token, accountId, section.db_id, {
        field_key: tokenId,
        label: created.label,
      })
      const row = await getOrganizationSettings(token, accountId)
      setForm(normalize(row))
      setNewFieldLabel('')
      setNewFieldType('text')
      setAddingForSectionId(null)
      success('Added', 'Custom field added and saved to this section.')
    } catch (e) {
      showError('Could not add custom field', e instanceof Error ? e.message : undefined)
    } finally {
      setCreatingField(false)
    }
  }

  async function save() {
    if (!token || !form || !Number.isFinite(accountId)) return
    setSaving(true)
    try {
      const updated = await patchOrganizationSettings(token, accountId, {
        organization: {
          enabled_job_setup_sections: form.enabled_job_setup_sections,
          enabled_job_setup_fields: form.enabled_job_setup_fields,
        },
      })
      setForm(normalize(updated))
      success('Saved', 'Job setup visibility updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  async function onCreateSection() {
    if (!token || !Number.isFinite(accountId) || !newSectionLabel.trim()) return
    setCreatingSection(true)
    try {
      await createJobSetupSection(token, accountId, { label: newSectionLabel.trim() })
      setNewSectionLabel('')
      await load()
      success('Section added', 'New section is available in the job editor after you enable it.')
    } catch (e) {
      showError('Could not create section', e instanceof Error ? e.message : undefined)
    } finally {
      setCreatingSection(false)
    }
  }

  async function commitSectionRename(section: JobSetupCatalogSection) {
    if (!token || !Number.isFinite(accountId) || !draftSectionLabel.trim()) return
    try {
      await updateJobSetupSection(token, accountId, section.db_id, { label: draftSectionLabel.trim() })
      setEditingSectionDbId(null)
      await load()
      success('Updated', 'Section name saved.')
    } catch (e) {
      showError('Rename failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function commitFieldRename(field: JobSetupCatalogField) {
    if (!token || !Number.isFinite(accountId) || !draftFieldLabel.trim()) return
    try {
      await updateJobSetupField(token, accountId, field.db_id, { label: draftFieldLabel.trim() })
      setEditingFieldDbId(null)
      await load()
      success('Updated', 'Field label saved.')
    } catch (e) {
      showError('Rename failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function removeSection(section: JobSetupCatalogSection) {
    if (!token || !Number.isFinite(accountId) || section.built_in) return
    if (!window.confirm(`Delete section “${section.label}”? This cannot be undone.`)) return
    try {
      await destroyJobSetupSection(token, accountId, section.db_id)
      await load()
      success('Deleted', 'Section removed.')
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  async function removeField(field: JobSetupCatalogField) {
    if (!token || !Number.isFinite(accountId)) return
    if (!window.confirm(`Remove field “${field.label}”?`)) return
    try {
      await destroyJobSetupField(token, accountId, field.db_id)
      await load()
      success('Deleted', 'Field removed.')
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  if (!token || !Number.isFinite(accountId)) return null

  return (
    <div className="settings-org-page job-setup-flow-page">
      <div className="job-setup-flow-hero">
        <div className="job-setup-flow-hero-content">
          <div className="job-setup-flow-hero-title-row">
            <h2 className="job-setup-flow-hero-title">Job Setup Flow</h2>
          </div>
          <p className="settings-lead job-setup-flow-lead">
            Configure which sections are visible in the job setup wizard. Disabled sections are hidden for this
            workspace. You can add custom sections and rename labels; built-in sections cannot be deleted.
          </p>
          <div className="job-setup-flow-metrics" aria-label="Job setup flow overview">
            <div className="job-setup-flow-metric-card">
              <span className="job-setup-flow-metric-label">Visible sections</span>
              <strong className="job-setup-flow-metric-value">
                {enabledSectionCount}/{totalSectionCount || 0}
              </strong>
            </div>
            <div className="job-setup-flow-metric-card">
              <span className="job-setup-flow-metric-label">Custom fields</span>
              <strong className="job-setup-flow-metric-value">{totalCustomFieldCount}</strong>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary btn-primary--inline job-setup-flow-save-btn"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {loading || !form ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <>
          <div className="job-setup-flow-shell">
            <div className="esign-field-block settings-org-field--wide job-setup-flow-shell-card">
              <label className="job-setup-flow-shell-title">Enabled sections</label>
              <p className="settings-field-hint job-setup-flow-shell-hint">
                Toggle sections and fields, then use <strong>Save changes</strong> to update the job editor. Section and
                field renames apply immediately.
              </p>
              <div className="job-setup-sections-list">
                {catalogSections.map(section => {
                  const sectionEnabled = selected.has(section.id)
                  const sectionFieldIds = form.enabled_job_setup_fields?.[section.id] ?? section.fields.map(field => field.id)
                  const enabledFields = new Set(
                    sectionFieldIds ??
                      DEFAULT_JOB_SETUP_FIELDS_BY_SECTION[
                        section.id as keyof typeof DEFAULT_JOB_SETUP_FIELDS_BY_SECTION
                      ] ??
                      section.fields.map(field => field.id),
                  )
                  const customTokens = sectionFieldIds.filter(id => id.startsWith('custom:'))
                  const visibleCount = sectionFieldIds.filter(id => enabledFields.has(id)).length
                  return (
                    <div key={section.id} className="job-setup-section-card">
                      <div className="job-setup-section-head">
                        <label className="job-setup-section-toggle">
                          <input
                            type="checkbox"
                            checked={sectionEnabled}
                            onChange={e => toggleSection(section.id, e.target.checked)}
                          />
                          <span className="job-setup-section-title-wrap">
                            {editingSectionDbId === section.db_id ? (
                              <span className="job-setup-inline-rename">
                                <input
                                  className="esign-pro-input"
                                  value={draftSectionLabel}
                                  onChange={e => setDraftSectionLabel(e.target.value)}
                                  aria-label="Section name"
                                />
                                <button
                                  type="button"
                                  className="btn-primary btn-primary--inline"
                                  onClick={() => void commitSectionRename(section)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-secondary--inline"
                                  onClick={() => setEditingSectionDbId(null)}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <span>{section.label}</span>
                            )}
                          </span>
                        </label>
                        <div className="job-setup-section-meta">
                          <span className="job-setup-section-pill">
                            {visibleCount}/{sectionFieldIds.length} visible
                          </span>
                          <span className="job-setup-section-pill">{customTokens.length} custom</span>
                          {editingSectionDbId !== section.db_id && (
                            <button
                              type="button"
                              className="btn-secondary btn-secondary--inline"
                              aria-label={`Rename section ${section.label}`}
                              onClick={() => {
                                setEditingSectionDbId(section.db_id)
                                setDraftSectionLabel(section.label)
                              }}
                            >
                              Rename
                            </button>
                          )}
                          {!section.built_in && (
                            <button
                              type="button"
                              className="btn-secondary btn-secondary--inline"
                              onClick={() => void removeSection(section)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`job-setup-fields-list${sectionEnabled ? '' : ' is-disabled'}`}>
                        {section.fields.map(field => (
                          <div key={field.id} className="job-setup-field-row">
                            <label className="job-setup-field-row-inner">
                              <input
                                type="checkbox"
                                disabled={!sectionEnabled}
                                checked={enabledFields.has(field.id)}
                                onChange={e => toggleField(section.id, field.id, e.target.checked)}
                              />
                              {editingFieldDbId === field.db_id ? (
                                <span className="job-setup-inline-rename">
                                  <input
                                    className="esign-pro-input"
                                    value={draftFieldLabel}
                                    onChange={e => setDraftFieldLabel(e.target.value)}
                                    aria-label="Field label"
                                  />
                                  <button
                                    type="button"
                                    className="btn-primary btn-primary--inline"
                                    onClick={() => void commitFieldRename(field)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-secondary--inline"
                                    onClick={() => setEditingFieldDbId(null)}
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <span>{field.label}</span>
                              )}
                            </label>
                            {editingFieldDbId !== field.db_id && (
                              <span className="job-setup-field-actions">
                                <button
                                  type="button"
                                  className="btn-secondary btn-secondary--inline"
                                  aria-label={`Rename ${field.label}`}
                                  onClick={() => {
                                    setEditingFieldDbId(field.db_id)
                                    setDraftFieldLabel(field.label)
                                  }}
                                >
                                  Rename
                                </button>
                                {!field.built_in && (
                                  <button
                                    type="button"
                                    className="btn-secondary btn-secondary--inline"
                                    onClick={() => void removeField(field)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                        {customTokens.map(tokenId => {
                          const key = tokenId.replace(/^custom:/, '')
                          const def = jobCustomDefs.find(d => d.attribute_key === key)
                          const inFields = section.fields.some(f => f.id === tokenId)
                          if (inFields) return null
                          return (
                            <label key={tokenId} className="job-setup-field-row job-setup-field-row--custom">
                              <input
                                type="checkbox"
                                disabled={!sectionEnabled}
                                checked={enabledFields.has(tokenId)}
                                onChange={e => toggleField(section.id, tokenId, e.target.checked)}
                              />
                              <span>{def ? `${def.label} (custom)` : `${key} (custom)`}</span>
                            </label>
                          )
                        })}
                        {addingForSectionId === section.id ? (
                          <div className="job-setup-add-panel">
                            <input
                              className="esign-pro-input"
                              placeholder="Custom field label"
                              value={newFieldLabel}
                              onChange={e => setNewFieldLabel(e.target.value)}
                            />
                            <select
                              className="esign-pro-input"
                              value={newFieldType}
                              onChange={e => setNewFieldType(e.target.value as CustomAttributeDefinition['field_type'])}
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="decimal">Decimal</option>
                              <option value="boolean">Boolean</option>
                              <option value="date">Date</option>
                              <option value="list">List</option>
                            </select>
                            <div className="job-setup-add-panel-actions">
                              <button
                                type="button"
                                className="btn-primary btn-primary--inline"
                                disabled={creatingField}
                                onClick={() => void addCustomField(section)}
                              >
                                {creatingField ? 'Adding…' : 'Add custom field'}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-secondary--inline"
                                onClick={() => setAddingForSectionId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary btn-secondary--inline job-setup-add-btn"
                            disabled={!sectionEnabled}
                            onClick={() => setAddingForSectionId(section.id)}
                          >
                            + Add custom field
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="job-setup-new-section" style={{ marginTop: 20 }}>
                <label className="job-setup-flow-shell-title" style={{ display: 'block', marginBottom: 8 }}>
                  New section
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <input
                    className="esign-pro-input"
                    style={{ maxWidth: 320 }}
                    placeholder="Section title (e.g. Security clearance)"
                    value={newSectionLabel}
                    onChange={e => setNewSectionLabel(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary btn-primary--inline"
                    disabled={creatingSection || !newSectionLabel.trim()}
                    onClick={() => void onCreateSection()}
                  >
                    {creatingSection ? 'Creating…' : 'Add section'}
                  </button>
                </div>
                <p className="settings-field-hint" style={{ marginTop: 8 }}>
                  Custom sections appear in the job editor after you enable them and save. Use the generic step layout
                  until you add custom fields to the section.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
