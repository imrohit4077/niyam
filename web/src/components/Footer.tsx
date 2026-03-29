export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="footer-brand">
            <div className="footer-brand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 18L12 4L20 18H16L12 10L8 18H4Z" fill="currentColor" />
              </svg>
            </div>
            <span className="footer-brand-text">ATS</span>
          </div>
          <span className="footer-copyright">&copy; {year} ATS. All rights reserved.</span>
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
