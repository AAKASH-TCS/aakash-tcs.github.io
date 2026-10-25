import { motion } from 'framer-motion'
import { ArrowUpRight, Building2, FlaskConical, Sparkles } from 'lucide-react'
import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import { GithubIcon } from './Icon'
import { fadeUp, stagger } from '../lib/motion'
import { safeUrl } from '../lib/safeUrl'

const GROUPS = [
  {
    type: 'enterprise',
    Icon: Building2,
    title: 'Work at Movate',
    blurb: 'Built as an AI Engineer at Movate. The real systems belong to the clients, so these pictures show how they work rather than what they look like.',
  },
  {
    type: 'personal',
    Icon: FlaskConical,
    title: 'Personal projects',
    blurb: 'What I build when nobody is paying me to.',
  },
]

function ProjectImage({ project }) {
  const src = safeUrl(project.image)
  if (!src) return null
  return (
    <figure className="project-media">
      <img src={src} alt={project.imageAlt || ''} width="800" height="450" loading="lazy" decoding="async" />
    </figure>
  )
}

function ProjectLinks({ project }) {
  const repo = safeUrl(project.repo)
  const demo = safeUrl(project.demo)
  if (!repo && !demo) return null
  return (
    <div className="project-links">
      {repo && (
        <a href={repo} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} source code`}>
          <GithubIcon width={16} height={16} /> Code
        </a>
      )}
      {demo && (
        <a href={demo} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} live demo`}>
          Live <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

function Highlights({ items }) {
  if (!items?.length) return null
  return (
    <ul className="project-highlights">
      {items.map((h) => <li key={h.slice(0, 32)}>{h}</li>)}
    </ul>
  )
}

function OriginBadge({ project }) {
  if (project.client) {
    return (
      <span className="client-badge">
        <Building2 size={14} aria-hidden="true" /> Client: {project.client}
      </span>
    )
  }
  if (project.type === 'enterprise') {
    return (
      <span className="client-badge">
        <Building2 size={14} aria-hidden="true" /> Built at {project.builtAt || 'work'}
      </span>
    )
  }
  return <span className="personal-badge">Personal</span>
}

// Image beside the write-up: used for named-client work, or a group's only project.
function WideCard({ project, index }) {
  return (
    <GlassCard as="article" className="project project--wide" {...stagger(index)}>
      <ProjectImage project={project} />
      <div className="project-body">
        <div className="project-top">
          <OriginBadge project={project} />
          <span className="tag">{project.category}</span>
        </div>
        <h3>{project.title}</h3>
        {project.client && project.builtAt && <p className="project-built">Built at {project.builtAt}</p>}
        <p className="project-summary">{project.summary}</p>
        <Highlights items={project.highlights} />
        <p className="project-impact">
          <Sparkles size={15} aria-hidden="true" /> {project.impact}
        </p>
        <ul className="chips chips--sm">
          {project.tech.map((t) => <li key={t} className="chip">{t}</li>)}
        </ul>
        <ProjectLinks project={project} />
      </div>
    </GlassCard>
  )
}

// Image on top, in a grid.
function CompactCard({ project, index }) {
  return (
    <GlassCard as="article" tilt className="project project--compact" {...stagger(index)}>
      <ProjectImage project={project} />
      <div className="project-body">
        <div className="project-top">
          <OriginBadge project={project} />
          <span className="tag">{project.category}</span>
        </div>
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <Highlights items={project.highlights} />
        <p className="project-impact">
          <Sparkles size={15} aria-hidden="true" /> {project.impact}
        </p>
        <ul className="chips chips--sm">
          {project.tech.map((t) => <li key={t} className="chip">{t}</li>)}
        </ul>
        <ProjectLinks project={project} />
      </div>
    </GlassCard>
  )
}

export default function Projects({ projects }) {
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <SectionHeading eyebrow="Projects" title="Things I've built" id="projects-title">
        Production work for enterprise clients, plus Cortana, the assistant I build for myself after hours.
      </SectionHeading>

      {GROUPS.map(({ type, Icon, title, blurb }) => {
        const items = projects.filter((p) => (p.type ?? 'personal') === type)
        if (!items.length) return null
        const isWide = (p) => items.length === 1 || (type === 'enterprise' && !!p.client)
        const wide = items.filter(isWide)
        const compact = items.filter((p) => !isWide(p))
        return (
          <div key={type} className={`project-group project-group--${type}`}>
            <motion.header className="group-head" {...fadeUp}>
              <span className="group-icon"><Icon size={20} aria-hidden="true" /></span>
              <div>
                <h3>
                  {title} <span className="group-count">{items.length}</span>
                </h3>
                <p>{blurb}</p>
              </div>
            </motion.header>
            {wide.length > 0 && (
              <div className="projects-grid projects-grid--wide">
                {wide.map((p, i) => <WideCard key={p.title} project={p} index={i} />)}
              </div>
            )}
            {compact.length > 0 && (
              <div className="projects-grid projects-grid--compact">
                {compact.map((p, i) => <CompactCard key={p.title} project={p} index={i} />)}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
