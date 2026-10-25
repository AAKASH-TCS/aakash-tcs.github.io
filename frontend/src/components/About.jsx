import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import Counter from './Counter'
import { stagger } from '../lib/motion'

// Illustrative run of the kind of agent I build (support chatbot with GraphRAG + MCP).
const LOG = [
  { t: 'trigger', k: 'user', v: '"My switch keeps dropping its VLAN config"' },
  { t: 'step', k: 'graphrag', v: 'Cypher lookup → intent: device_support' },
  { t: 'step', k: 'route', v: 'orchestrator → support agent' },
  { t: 'step', k: 'retrieve', v: 'grounded context from knowledge base' },
  { t: 'step', k: 'mcp.tool', v: 'salesforce.create_ticket → #48213' },
  { t: 'done', k: 'done', v: 'answer streamed over SSE · ticket raised' },
]

// A looping "automation run" that shows, rather than tells, what I build.
function AutomationConsole() {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? LOG.length : 0)

  useEffect(() => {
    if (reduce) return
    const t = setTimeout(
      () => setShown((n) => (n >= LOG.length ? 0 : n + 1)),
      shown >= LOG.length ? 3500 : 650,
    )
    return () => clearTimeout(t)
  }, [shown, reduce])

  return (
    <div className="console" role="img" aria-label="Example agent run: a support question is matched to an intent with GraphRAG, routed to a support agent, answered with grounded context, and a ticket is raised through an MCP tool.">

      <div className="console-bar" aria-hidden="true">
        <span /><span /><span />
        <em>agent.run</em>
      </div>
      <ol className="console-body" aria-hidden="true">
        {LOG.slice(0, shown).map((l, i) => (
          <motion.li key={`${i}-${l.k}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`log log--${l.t}`}>
            <span className="log-key">{l.t === 'step' ? '↳ ' : l.t === 'done' ? '✔ ' : '▶ '}{l.k}</span>
            <span className="log-val">{l.v}</span>
          </motion.li>
        ))}
        {shown < LOG.length && <li className="log log--cursor"><span className="caret" /></li>}
      </ol>
    </div>
  )
}

export default function About({ profile }) {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <SectionHeading eyebrow="About" title="I like it when computers do the boring bits" id="about-title" />

      <div className="bento bento--about">
        <GlassCard className="about-text" {...stagger(0)}>
          <h3>The short version</h3>
          {profile.about.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
        </GlassCard>

        <GlassCard className="about-console" {...stagger(1)}>
          <AutomationConsole />
        </GlassCard>

        <GlassCard className="about-stats" {...stagger(2)}>
          <ul className="stats">
            {profile.stats.map((s) => (
              <li key={s.label}>
                <strong className="text-gradient"><Counter value={s.value} suffix={s.suffix} /></strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </section>
  )
}
