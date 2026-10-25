import { motion } from 'framer-motion'
import { fadeUp } from '../lib/motion'

export default function SectionHeading({ eyebrow, title, children, id }) {
  return (
    <motion.header className="section-head" {...fadeUp}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      {children && <p className="section-sub">{children}</p>}
    </motion.header>
  )
}
