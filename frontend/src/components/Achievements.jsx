import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import Icon from './Icon'
import { EASE } from '../lib/motion'

export default function Achievements({ items }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 22 })

  return (
    <section id="achievements" className="section" aria-labelledby="achievements-title">
      <SectionHeading eyebrow="Achievements" title="A few things I'm proud of" id="achievements-title">
        A degree, a couple of certificates, and the time I got to judge a hackathon instead of losing one.
      </SectionHeading>

      <div className="timeline" ref={ref}>
        <div className="timeline-line" aria-hidden="true">
          <motion.div className="timeline-fill" style={{ scaleY }} />
        </div>
        <ol className="timeline-list">
        {items.map((a, i) => (
          <li key={`${a.year}-${a.title}`} className={`timeline-item ${i % 2 ? 'is-right' : 'is-left'}`}>
            <span className="timeline-dot" aria-hidden="true"><Icon name={a.icon} size={16} /></span>
            <GlassCard
              className="achievement"
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {a.year && <span className="achievement-year">{a.year}</span>}
              <h3 className={a.year ? '' : 'no-year'}>{a.title}</h3>
              <p className="achievement-org">{a.org}</p>
              <p>{a.detail}</p>
            </GlassCard>
          </li>
        ))}
        </ol>
      </div>
    </section>
  )
}
