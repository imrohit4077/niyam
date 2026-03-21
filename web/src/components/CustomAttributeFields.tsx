import type { CustomAttributeDefinition } from '../api/customAttributes'

export type CustomAttrValues = Record<string, unknown>

function coerceOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(x => String(x).trim()).filter(Boolean)
}

export default function CustomAttributeFields({
  definitions,
  values,
  onChange,
  disabled,
  idPrefix = 'caf',
}: {
  definitions: CustomAttributeDefinition[]
  values: CustomAttrValues
  onChange: (next: CustomAttrValues) => void
  disabled?: boolean
  idPrefix?: string
}) {
  if (!definitions.length) return null

  const setKey = (key: string, v: unknown) => {
    onChange({ ...values, [key]: v })
  }

  return (
    <div className="custom-attr-fields">
      {definitions.map(d => {
        const id = `${idPrefix}-${d.attribute_key}`
        const v = values[d.attribute_key]
        const req = d.required ? ' *' : ''

        if (d.field_type === 'text') {
          return (
            <div key={d.id} className="custom-attr-field">
              <label className="custom-attr-label" htmlFor={id}>
                {d.label}
                {req && <span className="custom-attr-req">{req}</span>}
              </label>
              <input
                id={id}
                className="custom-attr-input"
                disabled={disabled}
                value={v != null && typeof v !== 'boolean' ? String(v) : ''}
                onChange={e => setKey(d.attribute_key, e.target.value)}
              />
            </div>
          )
        }

        if (d.field_type === 'number') {
          return (
            <div key={d.id} className="custom-attr-field">
              <label className="custom-attr-label" htmlFor={id}>
                {d.label}
                {req && <span className="custom-attr-req">{req}</span>}
              </label>
              <input
                id={id}
                type="number"
                step={1}
                className="custom-attr-input"
                disabled={disabled}
                value={v != null && v !== '' ? String(v) : ''}
                onChange={e => {
                  const t = e.target.value
                  setKey(d.attribute_key, t === '' ? '' : Number(t))
                }}
              />
            </div>
          )
        }

        if (d.field_type === 'decimal') {
          return (
            <div key={d.id} className="custom-attr-field">
              <label className="custom-attr-label" htmlFor={id}>
                {d.label}
                {req && <span className="custom-attr-req">{req}</span>}
              </label>
              <input
                id={id}
                type="number"
                step="any"
                className="custom-attr-input"
                disabled={disabled}
                value={v != null && v !== '' ? String(v) : ''}
                onChange={e => {
                  const t = e.target.value
                  setKey(d.attribute_key, t === '' ? '' : t)
                }}
              />
            </div>
          )
        }

        if (d.field_type === 'boolean') {
          return (
            <div key={d.id} className="custom-attr-field custom-attr-field--check">
              <label className="custom-attr-check">
                <input
                  id={id}
                  type="checkbox"
                  disabled={disabled}
                  checked={v === true}
                  onChange={e => setKey(d.attribute_key, e.target.checked)}
                />
                <span>
                  {d.label}
                  {req && <span className="custom-attr-req">{req}</span>}
                </span>
              </label>
            </div>
          )
        }

        if (d.field_type === 'date') {
          return (
            <div key={d.id} className="custom-attr-field">
              <label className="custom-attr-label" htmlFor={id}>
                {d.label}
                {req && <span className="custom-attr-req">{req}</span>}
              </label>
              <input
                id={id}
                type="date"
                className="custom-attr-input"
                disabled={disabled}
                value={v != null ? String(v).slice(0, 10) : ''}
                onChange={e => setKey(d.attribute_key, e.target.value || '')}
              />
            </div>
          )
        }

        if (d.field_type === 'list') {
          const opts = coerceOptions(d.options)
          return (
            <div key={d.id} className="custom-attr-field">
              <label className="custom-attr-label" htmlFor={id}>
                {d.label}
                {req && <span className="custom-attr-req">{req}</span>}
              </label>
              <select
                id={id}
                className="custom-attr-input"
                disabled={disabled}
                value={v != null ? String(v) : ''}
                onChange={e => setKey(d.attribute_key, e.target.value)}
              >
                {!d.required && <option value="">—</option>}
                {opts.map(o => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
