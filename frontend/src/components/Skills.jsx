import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import Icon from './Icon'
import { stagger } from '../lib/motion'

function Marquee({ items }) {
  return (
    <div className="marquee" aria-hidden="true">
      {[0, 1].map((copy) => (
        <ul className="marquee-track" key={copy}>
          {items.map((s) => <li key={s}>{s}</li>)}
        </ul>
      ))}
    </div>
  )
}

export default function Skills({ skills }) {
  const all = skills.flatMap((g) => g.items)
  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <SectionHeading eyebrow="Toolkit" title="The stack behind the magic" id="skills-title">
        From prompt to production: the tools I use to design, ship and run intelligent systems.
      </SectionHeading>

      <div className="bento bento--skills">
        {skills.map((g, i) => (
          <GlassCard key={g.group} className={`skill-card skill-card--${i}`} {...stagger(i, 0.06)}>
            <div className="skill-icon"><Icon name={g.icon} size={22} /></div>
            <h3>{g.group}</h3>
            <ul className="chips">
              {g.items.map((s) => <li key={s} className="chip">{s}</li>)}
            </ul>
          </GlassCard>
        ))}
      </div>

      <Marquee items={all} />
    </section>
  )
}
