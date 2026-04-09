import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  getOrganizationSettings,
  patchOrganizationSettings,
  type OrganizationSettings,
} from '../../api/accountOrganization'

function normalizeOrg(row: OrganizationSettings): OrganizationSettings {
  return {
    ...row,
    departments: Array.isArray(row.departments) ? row.departments : [],
  }
}

export default function DepartmentsSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken, loadProfile } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationSettings | null>(null)
  const [deptInput, setDeptInput] = useState('')

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(accountId)) return
    setLoading(true)
    try {
      const row = await getOrganizationSettings(token, accountId)
      setForm(normalizeOrg(row))
    } catch (e) {
      showError('Could not load departments', e instanceof Error ? e.message : undefined)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [token, accountId, showError])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!token || !form || !Number.isFinite(accountId)) return
    setSaving(true)
    try {
      const updated = await patchOrganizationSettings(token, accountId, {
        organization: {
          departments: form.departments,
        },
      })
      setForm(normalizeOrg(updated))
      await loadProfile()
      success('Saved', 'Departments updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const addDepartment = () => {
    if (!form) return
    const n = deptInput.trim()
    if (!n) return
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `d-${Date.now()}`
    setForm({ ...form, departments: [...form.departments, { id, name: n }] })
    setDeptInput('')
  }

  const removeDepartment = (id: string) => {
    if (!form) return
    setForm({ ...form, departments: form.departments.filter(d => d.id !== id) })
  }

  if (!token || !Number.isFinite(accountId)) return null

  return (
    <div className="settings-org-page">
      <p className="settings-lead">
        Departments appear in job forms and the Jobs list filters. Add the teams or functions your company hires for.
      </p>

      {loading || !form ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <>
          <div className="settings-org-toolbar">
            <h2 className="settings-org-title">Departments</h2>
            <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div className="settings-org-grid">
            <div className="settings-org-section settings-org-field--wide">
            <div className="settings-dept-add">
              <input
                className="esign-pro-input"
                value={deptInput}
                onChange={e => setDeptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDepartment()
                  }
                }}
                placeholder="e.g. Engineering"
                aria-label="New department name"
              />
              <button type="button" className="btn-secondary btn-secondary--inline" onClick={addDepartment}>
                Add
              </button>
            </div>
            {form.departments.length > 0 ? (
              <ul className="settings-dept-list">
                {form.departments.map(d => (
                  <li key={d.id} className="settings-dept-item">
                    <span>{d.name}</span>
                    <button
                      type="button"
                      className="btn-link-quiet btn-link-quiet--danger"
                      onClick={() => removeDepartment(d.id)}
                      aria-label={`Remove ${d.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="settings-muted settings-dept-empty">No departments yet.</p>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
