import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, Power, Trophy } from 'lucide-react'
import AgentRoad from './AgentRoad'
import { GAME_EVENT, LEVELS } from '../../lib/game'
import { EASE } from '../../lib/motion'

const ROAD_MIN_WIDTH = 1260 // below this the margins are too narrow for the road
const SPEEDRUN_MS = 25000

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

function Hud({ level, progress, tokens, showTokens, onQuit }) {
  return (
    <div className="game-hud glass">
      <div className="hud-row">
        <span className="hud-level">LVL {level}</span>
        <span className="hud-name">{LEVELS[level].short}</span>
        <button className="hud-btn" onClick={onQuit} aria-label="Turn off game mode" title="Turn off game mode">
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
    </div>
  )
}

export default function GameLayer({ on, setOn }) {
  const wide = useWideEnough()
  const { level, progress } = useLevelProgress()
  const [tokens, setTokens] = useState({ collected: 0, total: 0 })
  const [toasts, setToasts] = useState([])
  const [banner, setBanner] = useState(null)
  const unlocked = useRef(new Set())
  const seenLevels = useRef(new Set([0]))
  const startedAt = useRef(0)

  const unlock = useCallback((id, title, text) => {
    if (unlocked.current.has(id)) return
    unlocked.current.add(id)
    const key = `${id}-${Date.now()}`
    setToasts((ts) => [...ts.slice(-2), { key, title, text }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.key !== key)), 4500)
  }, [])

  // Level-ups: a banner the first time each level comes into view.
  useEffect(() => {
    if (!on || seenLevels.current.has(level)) return
    seenLevels.current.add(level)
    setBanner({ level, title: LEVELS[level].title })

    if (level === LEVELS.length - 1) {
      unlock('finish', 'Completionist', 'You made it to the end. Most people stop at the photo.')
      if (startedAt.current && Date.now() - startedAt.current < SPEEDRUN_MS) {
        setTimeout(() => unlock('speedrun', 'Speedrunner', 'Any% in under 25 seconds. Did you read any of it?'), 1200)
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
    unlock('start', 'Player one has entered the game', 'Scroll to explore. Collect tokens. Try not to skip the projects.')
  }, [progress, on, unlock])

  useEffect(() => {
    if (on && tokens.total > 0 && tokens.collected === tokens.total) {
      unlock('tokens', 'Token budget exhausted', 'Every token collected. Somewhere, an API bill just went up.')
    }
  }, [tokens, on, unlock])

  // Achievements reported by the rest of the page.
  useEffect(() => {
    if (!on) return
    const onEvent = (e) => {
      const { type, theme } = e.detail || {}
      const id = type === 'theme' ? `theme-${theme}` : type
      const a = EVENT_ACHIEVEMENTS[id]
      if (a) unlock(id, ...a)
    }
    window.addEventListener(GAME_EVENT, onEvent)
    return () => window.removeEventListener(GAME_EVENT, onEvent)
  }, [on, unlock])

  const onTokens = useCallback((collected, total) => setTokens({ collected, total }), [])

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
      <Hud level={level} progress={progress} tokens={tokens} showTokens={wide} onQuit={() => setOn(false)} />
      <Toasts toasts={toasts} />
    </>
  )
}
