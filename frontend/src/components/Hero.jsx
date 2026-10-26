import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowDown, ArrowUpRight, Bot, Cpu, Download, MapPin, Sparkles, Workflow, Zap } from 'lucide-react'
import Typewriter from './Typewriter'
import { EASE } from '../lib/motion'
import { isSameSite, safeUrl } from '../lib/safeUrl'
import { emitGame } from '../lib/game'

const ORBIT_CHIPS = [
  { label: 'LangGraph Agents', Icon: Bot },
  { label: 'MCP Tools', Icon: Workflow },
  { label: 'GraphRAG', Icon: Cpu },
  { label: 'Zero busywork', Icon: Zap },
]

function MagneticButton({ href, className, children, ...rest }) {
  const ref = useRef(null)
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 })
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 })

  function onPointerMove(e) {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => { x.set(0); y.set(0) }}
      whileTap={{ scale: 0.96 }}
      {...rest}
    >
      {children}
    </motion.a>
  )
}

const reveal = (delay) => ({
  initial: { opacity: 0, y: 30, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, delay, ease: EASE },
})

export default function Hero({ profile }) {
  const [first, ...rest] = profile.name.split(' ')
  const resume = safeUrl(profile.resumeUrl)
  const photo = safeUrl(profile.photo)

  return (
    <section id="top" className="hero section" aria-labelledby="hero-title">
      <div className="hero-copy">
        <motion.span className="pill" {...reveal(0.05)}>
          <span className="pulse-dot" aria-hidden="true" />
          {profile.availability}
        </motion.span>

        <motion.h1 id="hero-title" className="hero-title" {...reveal(0.15)}>
          <span className="hero-hi">Hi, I'm</span>
          <span className="text-gradient">{first}</span> <span>{rest.join(' ')}</span>
        </motion.h1>

        <motion.p className="hero-role" {...reveal(0.3)}>
          <Sparkles size={20} aria-hidden="true" className="hero-role-icon" />
          <Typewriter words={profile.roles} />
        </motion.p>

        <motion.p className="hero-tagline" {...reveal(0.42)}>
          {profile.tagline}
        </motion.p>

        <motion.div className="hero-ctas" {...reveal(0.55)}>
          <MagneticButton href="#projects" className="btn btn-primary">
            See what I've built <ArrowUpRight size={18} aria-hidden="true" />
          </MagneticButton>
          {resume ? (
            <MagneticButton
              href={resume}
              className="btn btn-ghost"
              onClick={() => emitGame('resume')}
              {...(isSameSite(resume) ? { download: '' } : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              <Download size={18} aria-hidden="true" /> Download résumé
            </MagneticButton>
          ) : (
            <MagneticButton href="#contact" className="btn btn-ghost">
              Say hello
            </MagneticButton>
          )}
        </motion.div>

        <motion.p className="hero-meta" {...reveal(0.65)}>
          <MapPin size={15} aria-hidden="true" /> {profile.location} · {profile.headline}
        </motion.p>
      </div>

      <motion.div
        className="hero-visual"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
        aria-hidden="true"
      >
        <div className="orb">
          <div className="orb-ring orb-ring--1" />
          <div className="orb-ring orb-ring--2" />
          {photo ? (
            <div className="orb-core orb-core--photo">
              <img src={photo} alt="" width="640" height="640" decoding="async" fetchPriority="high" />
            </div>
          ) : (
            <div className="orb-core">
              <span className="orb-initials">{profile.initials}</span>
              <span className="orb-caption">AI · Automation</span>
            </div>
          )}
          {ORBIT_CHIPS.map(({ label, Icon }, i) => (
            <div key={label} className={`orb-chip orb-chip--${i + 1} glass`}>
              <Icon size={14} />
              {label}
            </div>
          ))}
        </div>
      </motion.div>

      <span className="play-hint" aria-hidden="true">Scroll to start ▸</span>
      <a href="#about" className="scroll-hint" aria-label="Scroll to About section">
        <ArrowDown size={18} aria-hidden="true" />
      </a>
    </section>
  )
}
