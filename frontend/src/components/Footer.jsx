import { ArrowUp } from 'lucide-react'

export default function Footer({ name }) {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} {name}. Built with React, Flask and a lot of curiosity.
      </p>
      <a href="#top" className="icon-btn" aria-label="Back to top">
        <ArrowUp size={18} aria-hidden="true" />
      </a>
    </footer>
  )
}
