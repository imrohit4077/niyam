import { Icon, Icon3D, type IconName, type Model3DName } from '../../icons'
import { GLYPHS } from '../../icons/glyphs'
import { MODEL_META } from '../../icons/three/meta'

/** Dev-only catalogue of every icon (route registered only in development builds). */
export default function IconGalleryPage() {
  const models = Object.keys(MODEL_META) as Model3DName[]
  const glyphs = Object.keys(GLYPHS) as IconName[]
  return (
    <div className="dev-icon-gallery">
      <h2>3D models ({models.length})</h2>
      <div className="dev-icon-grid">
        {models.map(name => (
          <figure key={name}>
            <Icon3D name={name} size={112} />
            <Icon3D name={name} size={48} tile />
            <figcaption>{name}</figcaption>
          </figure>
        ))}
      </div>
      <h2>Line glyphs ({glyphs.length})</h2>
      <div className="dev-icon-grid dev-icon-grid--glyphs">
        {glyphs.map(name => (
          <figure key={name}>
            <Icon name={name} size={24} />
            <figcaption>{name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
