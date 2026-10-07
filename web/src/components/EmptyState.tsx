import type { ReactNode } from 'react'
import { Icon3D, type Model3DName } from '../icons'

type Props = {
  icon?: Model3DName
  title: ReactNode
  text?: ReactNode
  actions?: ReactNode
  size?: number
  className?: string
}

/** Illustrated empty state: 3D icon, headline, guidance and optional actions. */
export function EmptyState({ icon = 'inbox', title, text, actions, size = 72, className }: Props) {
  return (
    <div className={className ? `nx-empty ${className}` : 'nx-empty'}>
      <Icon3D name={icon} size={size} />
      <div className="nx-empty-title">{title}</div>
      {text ? <div className="nx-empty-text">{text}</div> : null}
      {actions ? <div className="nx-empty-actions">{actions}</div> : null}
    </div>
  )
}

/** Skeleton rows shown while a list or panel loads. */
export function LoadingState({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="nx-loading" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="nx-loading-row">
          <div className="nx-skeleton nx-loading-avatar" />
          <div className="nx-loading-lines">
            <div className="nx-skeleton" style={{ width: `${58 - (i % 3) * 12}%`, height: 12 }} />
            <div className="nx-skeleton" style={{ width: `${34 + (i % 2) * 10}%`, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
