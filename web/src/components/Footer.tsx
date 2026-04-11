import NiyamLogo from './NiyamLogo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="footer-brand">
            <div className="footer-brand-icon">
              <NiyamLogo width={20} height={20} alt="" />
            </div>
            <span className="footer-brand-text">Niyam</span>
          </div>
          <span className="footer-copyright">&copy; {year} Niyam. All rights reserved.</span>
        </div>

        <div className="footer-center">
          <a className="footer-link" href="#">Documentation</a>
          <span className="footer-dot">&middot;</span>
          <a className="footer-link" href="#">API Reference</a>
          <span className="footer-dot">&middot;</span>
          <a className="footer-link" href="#">Status</a>
          <span className="footer-dot">&middot;</span>
          <a className="footer-link" href="#">Support</a>
        </div>

        <div className="footer-right">
          <span className="footer-version">v1.0.0</span>
        </div>
      </div>
    </footer>
  )
}
