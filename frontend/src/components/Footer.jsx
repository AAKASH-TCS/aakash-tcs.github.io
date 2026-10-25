import { ArrowUp } from 'lucide-react'

export default function Footer({ name }) {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} {name}. Designed and built by me, with the occasional assist from AI.
      </p>
      <a href="#top" className="icon-btn" aria-label="Back to top">
        <ArrowUp size={18} aria-hidden="true" />
      </a>
    </footer>
  )
}
