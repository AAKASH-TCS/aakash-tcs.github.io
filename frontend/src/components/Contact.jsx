import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock, Loader2, Mail, Send } from 'lucide-react'
import GlassCard from './GlassCard'
import SectionHeading from './SectionHeading'
import { GithubIcon, LinkedinIcon, XIcon } from './Icon'
import { STATIC_SITE, sendContact } from '../lib/api'
import { safeUrl } from '../lib/safeUrl'
import { stagger } from '../lib/motion'

const SAFE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

// Static hosting has no backend, so offer direct links instead of the form.
function ContactLinks({ profile }) {
  const email = SAFE_EMAIL.test(profile.email ?? '') ? profile.email : null
  const linkedin = safeUrl(profile.socials?.linkedin)
  return (
    <GlassCard className="contact-form contact-links" {...stagger(1)}>
      <h3>Get in touch</h3>
      <p>The quickest way to reach me is by email or a message on LinkedIn.</p>
      <div className="contact-actions">
        {email && (
          <a className="btn btn-primary" href={`mailto:${email}?subject=${encodeURIComponent('Hello from your portfolio')}`}>
            <Mail size={18} aria-hidden="true" /> Email me
          </a>
        )}
        {linkedin && (
          <a className="btn btn-ghost" href={linkedin} target="_blank" rel="noopener noreferrer me">
            <LinkedinIcon width={18} height={18} /> Connect on LinkedIn
          </a>
        )}
      </div>
      {email && <p className="contact-email">{email}</p>}
    </GlassCard>
  )
}

// Mirrors the server-side limits in backend/app/validators.py.
const LIMITS = { name: [2, 80], email: [5, 254], subject: [3, 120], message: [10, 4000] }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMPTY = { name: '', email: '', subject: '', message: '', website: '' }

function validate(values) {
  const errors = {}
  for (const [field, [lo, hi]] of Object.entries(LIMITS)) {
    const v = values[field].trim()
    if (!v) errors[field] = 'This field is required.'
    else if (v.length < lo || v.length > hi) errors[field] = `Must be between ${lo} and ${hi} characters.`
  }
  if (!errors.email && !EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  return errors
}

function Field({ id, label, error, as = 'input', ...props }) {
  const Comp = as
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Comp id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}

export default function Contact({ profile }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ state: 'idle', message: '' })

  const socials = [
    { key: 'github', label: 'GitHub', Icon: GithubIcon },
    { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
    { key: 'x', label: 'X', Icon: XIcon },
  ]
    .map((s) => ({ ...s, href: safeUrl(profile.socials?.[s.key]) }))
    .filter((s) => s.href)

  const onChange = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors(({ [name]: _, ...rest }) => rest)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (status.state === 'sending') return
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }
    setStatus({ state: 'sending', message: '' })
    try {
      await sendContact({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        website: values.website,
      })
      setValues(EMPTY)
      setStatus({ state: 'success', message: "Thanks! Your message is on its way. I'll get back to you soon." })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      const message = err.status === 429 ? "You've sent a few messages already. Please try again a bit later." : err.message || 'Something went wrong.'
      setStatus({ state: 'error', message })
    }
  }

  const sending = status.state === 'sending'

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <SectionHeading eyebrow="Contact" title="Let's automate something remarkable" id="contact-title">
        Have an idea, a repetitive process you'd like gone, or just want to talk AI? Drop me a message.
      </SectionHeading>

      <div className="contact-grid">
        <GlassCard className="contact-info" {...stagger(0)}>
          <div className="contact-badge"><Mail size={22} aria-hidden="true" /></div>
          <h3>What I can help with</h3>
          <ul className="contact-list">
            <li>Agentic AI with LangGraph, tool calling & MCP</li>
            <li>RAG and GraphRAG over your own data</li>
            <li>LLM integrations: Azure OpenAI, Gemini, Bedrock, Groq</li>
            <li>Python backends with Flask/FastAPI & streaming</li>
          </ul>
          <p className="contact-note"><Clock size={16} aria-hidden="true" /> Usually replies within 24–48 hours</p>
          {!STATIC_SITE && socials.length > 0 && (
            <div className="socials">
              {socials.map(({ key, label, Icon, href }) => (
                <a key={key} href={href} target="_blank" rel="noopener noreferrer me" className="icon-btn" aria-label={label}>
                  <Icon width={18} height={18} />
                </a>
              ))}
            </div>
          )}
        </GlassCard>

        {STATIC_SITE ? (
          <ContactLinks profile={profile} />
        ) : (
        <GlassCard as="form" className="contact-form" onSubmit={onSubmit} noValidate {...stagger(1)}>
          <div className="form-row">
            <Field id="name" label="Name" value={values.name} onChange={onChange} error={errors.name} autoComplete="name" maxLength={LIMITS.name[1]} required />
            <Field id="email" label="Email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" maxLength={LIMITS.email[1]} required />
          </div>
          <Field id="subject" label="Subject" value={values.subject} onChange={onChange} error={errors.subject} maxLength={LIMITS.subject[1]} required />
          <Field id="message" label="Message" as="textarea" rows={6} value={values.message} onChange={onChange} error={errors.message} maxLength={LIMITS.message[1]} required />
          <p className="char-count" aria-live="off">{values.message.length} / {LIMITS.message[1]}</p>

          {/* Honeypot: hidden from people and assistive tech, filled only by bots. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={onChange} />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
            {sending ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            {sending ? 'Sending…' : 'Send message'}
          </button>

          <div aria-live="polite" className="form-status-wrap">
            <AnimatePresence mode="wait">
              {(status.state === 'success' || status.state === 'error') && (
                <motion.p
                  key={status.state}
                  className={`form-status form-status--${status.state}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {status.state === 'success' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
                  {status.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
        )}
      </div>
    </section>
  )
}
