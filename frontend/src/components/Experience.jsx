import { Briefcase } from 'lucide-react'
import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import { stagger } from '../lib/motion'

export default function Experience({ items }) {
  if (!items?.length) return null
  const [current, ...earlier] = items

  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <SectionHeading eyebrow="Experience" title="Where I've worked" id="experience-title" />

      <div className="experience">
        <GlassCard as="article" className="job job--current" {...stagger(0)}>
          <div className="job-head">
            <span className="job-icon"><Briefcase size={20} aria-hidden="true" /></span>
            <div>
              <h3>{current.role} <span className="job-at">@ {current.company}</span></h3>
              <p className="job-period">{current.period}</p>
            </div>
          </div>
          {current.summary && <p className="job-summary">{current.summary}</p>}
          {current.points?.length > 0 && (
            <ul className="job-points">
              {current.points.map((p) => <li key={p.slice(0, 32)}>{p}</li>)}
            </ul>
          )}
        </GlassCard>

        {earlier.length > 0 && (
          <div className="job-earlier">
            {earlier.map((job, i) => (
              <GlassCard as="article" key={`${job.company}-${job.role}`} className="job" {...stagger(i + 1)}>
                <p className="job-period">{job.period}</p>
                <h3>{job.role}</h3>
                <p className="job-company">{job.company}</p>
                {job.summary && <p className="job-summary">{job.summary}</p>}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
