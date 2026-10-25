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

// Opens Gmail's compose window (new tab) with the recipient and subject filled in.
function gmailCompose(to) {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: 'Hello from your portfolio' })
  return `https://mail.google.com/mail/?${params}`
}

// Static hosting has no backend, so offer direct links instead of the form.
function ContactLinks({ profile }) {
  const email = SAFE_EMAIL.test(profile.email ?? '') ? profile.email : null
  const linkedin = safeUrl(profile.socials?.linkedin)
  return (
    <GlassCard className="contact-form contact-links" {...stagger(1)}>
      <h3>Drop me a line</h3>
      <p>Email is quickest. LinkedIn works too, if you'd rather keep things professional.</p>
      <div className="contact-actions">
        {email && (
          <a className="btn btn-primary" href={gmailCompose(email)} target="_blank" rel="noopener noreferrer">
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
      setStatus({ state: 'success', message: "Got it, thanks! I'll get back to you soon." })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      const message = err.status === 429 ? "That's a few messages already. Give it a little while and try again." : err.message || 'Something went wrong.'
      setStatus({ state: 'error', message })
    }
  }

  const sending = status.state === 'sending'

  return (
    <section id="contact" className="section" aria-labelledby="contact-title">
      <SectionHeading eyebrow="Contact" title="Say hello" id="contact-title">
        Got a process that eats your team's week, an idea for an agent, or just want to talk AI? I'd like to hear it.
      </SectionHeading>

      <div className="contact-grid">
        <GlassCard className="contact-info" {...stagger(0)}>
          <div className="contact-badge"><Mail size={22} aria-hidden="true" /></div>
          <h3>Things I can help with</h3>
          <ul className="contact-list">
            <li>AI agents that use real tools (LangGraph, MCP)</li>
            <li>Search and Q&amp;A over your own documents (RAG, GraphRAG)</li>
            <li>Hooking LLMs into the systems you already have</li>
            <li>Python backends that stream answers as they're written</li>
          </ul>
          <p className="contact-note"><Clock size={16} aria-hidden="true" /> I usually reply within a day or two</p>
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
