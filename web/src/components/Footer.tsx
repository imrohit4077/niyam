export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copyright">
          &copy; {year} <strong>Niyam</strong> · Hiring OS
        </span>
        <nav className="footer-links" aria-label="Footer">
          <a className="footer-link" href="#">Documentation</a>
          <a className="footer-link" href="#">API</a>
          <a className="footer-link" href="#">Status</a>
          <a className="footer-link" href="#">Support</a>
          <span className="footer-version">v1.0.0</span>
        </nav>
      </div>
    </footer>
  )
}
