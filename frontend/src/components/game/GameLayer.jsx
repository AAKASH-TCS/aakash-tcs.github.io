import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, Music, Power, Trophy, Volume2, VolumeX } from 'lucide-react'
import AgentRoad from './AgentRoad'
import { GAME_EVENT, LEVELS } from '../../lib/game'
import { audio } from '../../lib/sound'
import { EASE } from '../../lib/motion'

const ROAD_MIN_WIDTH = 1260 // below this the margins are too narrow for the road
const SPEEDRUN_MS = 25000
const COMBO_WINDOW_MS = 900
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']

const EVENT_ACHIEVEMENTS = {
  resume: ['Loot acquired', 'One résumé. Mostly LangGraph.'],
  contact: ['Quest accepted', 'Saying hello. Excellent choice.'],
  'theme-light': ['Light mode? Brave.', 'Your retinas have been notified.'],
  'theme-dark': ['Welcome back to the dark side', 'Your eyes thank you.'],
}

function useWideEnough() {
  const [wide, setWide] = useState(() => window.innerWidth >= ROAD_MIN_WIDTH)
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= ROAD_MIN_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return wide
}

function useAudioPrefs() {
  const [prefs, setPrefs] = useState(audio.prefs)
  useEffect(() => audio.subscribe(setPrefs), [])
  return prefs
}

// Which level is in view, plus overall progress (0–1), from scroll position.
function useLevelProgress() {
  const [state, setState] = useState({ level: 0, progress: 0 })
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const probe = window.innerHeight * 0.55
      let level = 0
      LEVELS.forEach((l, i) => {
        const el = document.getElementById(l.id)
        if (el && el.getBoundingClientRect().top <= probe) level = i
      })
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 1
      setState((s) =>
        s.level === level && Math.round(s.progress * 100) === Math.round(progress * 100) ? s : { level, progress },
      )
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return state
}

function LevelBanner({ banner }) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.level}
          className="level-banner"
          initial={{ opacity: 0, x: -80, skewX: -12 }}
          animate={{ opacity: 1, x: 0, skewX: 0 }}
          exit={{ opacity: 0, x: 80, skewX: 12 }}
          transition={{ duration: 0.55, ease: EASE }}
          aria-hidden="true"
        >
          <span className="level-banner-kicker">{banner.level === LEVELS.length - 1 ? 'Final level' : `Level ${banner.level}`}</span>
          <span className="level-banner-title">{banner.title}</span>
          <span className="level-banner-scan" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Toasts({ toasts }) {
  return (
    <div className="game-toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.key}
            layout
            className="game-toast glass"
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className="toast-icon"><Trophy size={18} aria-hidden="true" /></span>
            <span>
              <strong>{t.title}</strong>
              <span className="toast-text">{t.text}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// A burst of token-shaped confetti from the middle of the screen.
function Confetti({ burst }) {
  if (!burst) return null
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      {Array.from({ length: 44 }, (_, i) => {
        const angle = (i / 44) * Math.PI * 2 + Math.random() * 0.4
        const dist = 160 + Math.random() * 260
        return (
          <span
            key={i}
            style={{
              '--dx': `${Math.cos(angle) * dist}px`,
              '--dy': `${Math.sin(angle) * dist - 80}px`,
              '--rot': `${Math.random() * 720 - 360}deg`,
              '--delay': `${Math.random() * 0.12}s`,
              '--hue': `${[265, 190, 320, 45][i % 4]}`,
            }}
          />
        )
      })}
    </div>
  )
}

function Hud({ level, progress, tokens, showTokens, combo, prefs, onQuit }) {
  return (
    <div className="game-hud glass">
      <div className="hud-row">
        <span className="hud-level">LVL {level}</span>
        <span className="hud-name">{LEVELS[level].short}</span>
        <button
          className={`hud-btn ${prefs.music ? 'is-on' : ''} ${prefs.touched ? '' : 'hud-btn--hint'}`}
          onClick={() => audio.setMusic(!prefs.music)}
          aria-pressed={prefs.music}
          aria-label={prefs.music ? 'Turn music off (M)' : 'Turn music on (M)'}
          title={prefs.music ? 'Music off (M)' : 'Music on (M)'}
        >
          <Music size={14} aria-hidden="true" />
        </button>
        <button
          className={`hud-btn ${prefs.sfx ? 'is-on' : ''}`}
          onClick={() => audio.setSfx(!prefs.sfx)}
          aria-pressed={prefs.sfx}
          aria-label={prefs.sfx ? 'Turn sound effects off' : 'Turn sound effects on'}
          title={prefs.sfx ? 'Sound effects off' : 'Sound effects on'}
        >
          {prefs.sfx ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
        </button>
        <button className="hud-btn hud-btn--quit" onClick={onQuit} aria-label="Turn off game mode" title="Turn off game mode">
          <Power size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="hud-xp" aria-hidden="true">
        <span className="hud-xp-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="hud-row hud-meta">
        <span>Context window {Math.round(progress * 100)}%</span>
        {showTokens && tokens.total > 0 && (
          <span className="hud-tokens">
            <span className="hud-token-icon" aria-hidden="true" /> {tokens.collected}/{tokens.total}
          </span>
        )}
      </div>
      <AnimatePresence>
        {combo >= 3 && (
          <motion.span
            key={combo}
            className="hud-combo"
            initial={{ scale: 1.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            aria-hidden="true"
          >
            COMBO ×{combo}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function GameLayer({ on, setOn }) {
  const wide = useWideEnough()
  const prefs = useAudioPrefs()
  const { level, progress } = useLevelProgress()
  const [tokens, setTokens] = useState({ collected: 0, total: 0 })
  const [combo, setCombo] = useState(0)
  const [toasts, setToasts] = useState([])
  const [banner, setBanner] = useState(null)
  const [burst, setBurst] = useState(0)
  const unlocked = useRef(new Set())
  const seenLevels = useRef(new Set([0]))
  const startedAt = useRef(0)
  const comboRef = useRef({ count: 0, last: 0 })
  const prevCollected = useRef(0)
  const pokes = useRef(0)

  const unlock = useCallback((id, title, text) => {
    if (unlocked.current.has(id)) return
    unlocked.current.add(id)
    audio.play('achievement')
    const key = `${id}-${Date.now()}`
    setToasts((ts) => [...ts.slice(-2), { key, title, text }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.key !== key)), 4500)
  }, [])

  // Audio follows game mode; a remembered "sound on" resumes on first interaction.
  useEffect(() => audio.resumeOnFirstInteraction(), [])
  useEffect(() => audio.setActive(on), [on])

  // Level-ups: a banner and a jingle the first time each level comes into view.
  useEffect(() => {
    if (!on || seenLevels.current.has(level)) return
    seenLevels.current.add(level)
    setBanner({ level, title: LEVELS[level].title })
    audio.play('level')

    if (level === LEVELS.length - 1) {
      setTimeout(() => unlock('finish', 'Completionist', 'You made it to the end. Most people stop at the photo.'), 700)
      if (startedAt.current && Date.now() - startedAt.current < SPEEDRUN_MS) {
        setTimeout(() => unlock('speedrun', 'Speedrunner', 'Any% in under 25 seconds. Did you read any of it?'), 1900)
      }
    }
  }, [level, on, unlock])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 1700)
    return () => clearTimeout(t)
  }, [banner])

  useEffect(() => {
    if (!on || startedAt.current || progress < 0.02) return
    startedAt.current = Date.now()
    unlock('start', 'Player one has entered the game', 'Collect tokens as you scroll. Tap ♪ in the HUD for the soundtrack.')
  }, [progress, on, unlock])

  useEffect(() => {
    if (on && tokens.total > 0 && tokens.collected === tokens.total) {
      unlock('tokens', 'Token budget exhausted', 'Every token collected. Somewhere, an API bill just went up.')
    }
  }, [tokens, on, unlock])

  // Combos: tokens collected in quick succession climb in pitch.
  const onTokens = useCallback(
    (collected, total, initial) => {
      const gained = collected - prevCollected.current
      prevCollected.current = collected
      setTokens({ collected, total })
      if (initial || gained <= 0) return
      const now = performance.now()
      const c = comboRef.current
      c.count = now - c.last < COMBO_WINDOW_MS ? c.count + gained : gained
      c.last = now
      audio.play('token', { combo: c.count })
      setCombo(c.count)
      if (c.count >= 10) unlock('combo', 'Combo king', '10 tokens in one go. Smooth scrolling, champ.')
    },
    [unlock],
  )

  useEffect(() => {
    if (!combo) return
    const t = setTimeout(() => setCombo(0), COMBO_WINDOW_MS + 300)
    return () => clearTimeout(t)
  }, [combo])

  // Achievements and sounds reported by the rest of the page.
  useEffect(() => {
    if (!on) return
    const onEvent = (e) => {
      const { type, theme } = e.detail || {}
      if (type === 'poke') {
        pokes.current += 1
        audio.play('poke')
        if (pokes.current === 1) unlock('poke', 'Boop', "You poked the agent. It's fine, it's used to it.")
        if (pokes.current === 5) unlock('poke5', 'Okay, that is enough poking', 'The agent has raised a support ticket about you.')
        return
      }
      const id = type === 'theme' ? `theme-${theme}` : type
      const a = EVENT_ACHIEVEMENTS[id]
      if (a) unlock(id, ...a)
    }
    window.addEventListener(GAME_EVENT, onEvent)
    return () => window.removeEventListener(GAME_EVENT, onEvent)
  }, [on, unlock])

  // Keyboard: M toggles music; the Konami code does what the Konami code does.
  useEffect(() => {
    if (!on) return
    let progressIdx = 0
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const key = e.key.toLowerCase()
      if (key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) audio.setMusic(!audio.prefs.music)
      progressIdx = key === KONAMI[progressIdx] ? progressIdx + 1 : key === KONAMI[0] ? 1 : 0
      if (progressIdx === KONAMI.length) {
        progressIdx = 0
        audio.play('fanfare')
        setBurst(Date.now())
        unlock('konami', 'Cheat code accepted', '+30 lives. Sadly, still no free lunch.')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, unlock])

  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(0), 1800)
    return () => clearTimeout(t)
  }, [burst])

  // A soft tick on every link and button press.
  useEffect(() => {
    if (!on) return
    const onClick = (e) => {
      if (e.target.closest?.('a, button') && !e.target.closest('.game-hud')) audio.play('click')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [on])

  if (!on) {
    return (
      <button className="game-start glass" onClick={() => setOn(true)}>
        <Gamepad2 size={18} aria-hidden="true" /> Play mode
      </button>
    )
  }

  return (
    <>
      {wide && <AgentRoad onTokens={onTokens} />}
      <LevelBanner banner={banner} />
      <Confetti burst={burst} />
      <Hud
        level={level}
        progress={progress}
        tokens={tokens}
        showTokens={wide}
        combo={combo}
        prefs={prefs}
        onQuit={() => setOn(false)}
      />
      <Toasts toasts={toasts} />
    </>
  )
}
