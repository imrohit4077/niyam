import type { ReactNode } from 'react'
import { Icon3D, type Model3DName } from '../icons'

type Props = {
  icon: Model3DName
  title: ReactNode
  subtitle?: ReactNode
  /** Small line above the title, e.g. a section name. */
  eyebrow?: ReactNode
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode
  /** Extra content under the title row (tabs, meta chips). */
  children?: ReactNode
  className?: string
}

/** Standard page heading: 3D icon tile, title, subtitle and actions. */
export default function PageHeader({ icon, title, subtitle, eyebrow, actions, children, className }: Props) {
  return (
    <header className={className ? `page-header ${className}` : 'page-header'}>
      <div className="page-header-row">
        <Icon3D name={icon} size={52} tile />
        <div className="page-header-text">
          {eyebrow ? <div className="page-header-eyebrow">{eyebrow}</div> : null}
          <h1 className="page-header-title">{title}</h1>
          {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
      {children ? <div className="page-header-extra">{children}</div> : null}
    </header>
  )
}
