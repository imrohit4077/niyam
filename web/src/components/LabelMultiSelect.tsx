import type { AccountLabelRow } from '../api/labels'

type Props = {
  catalog: AccountLabelRow[]
  selectedIds: Set<number>
  disabled?: boolean
  emptyHint?: string
  onToggle: (labelId: number, nextChecked: boolean) => void
}

/** Chatwoot-style toggles: color swatch + title; parent handles PATCH / optimistic state. */
export default function LabelMultiSelect({ catalog, selectedIds, disabled, emptyHint, onToggle }: Props) {
  if (catalog.length === 0) {
    return <p className="label-multi-empty">{emptyHint ?? 'No workspace labels yet.'}</p>
  }
  return (
    <ul className="label-multi-list" role="list">
      {catalog.map(l => {
        const checked = selectedIds.has(l.id)
        return (
          <li key={l.id} className="label-multi-item">
            <label className="label-multi-row">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={e => onToggle(l.id, e.target.checked)}
              />
              <span
                className="label-multi-swatch"
                style={{ background: l.color?.trim() || 'var(--teal, #00b4d8)' }}
                aria-hidden
              />
              <span className="label-multi-text">
                <span className="label-multi-title">{l.title}</span>
                {l.description ? <span className="label-multi-desc">{l.description}</span> : null}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
