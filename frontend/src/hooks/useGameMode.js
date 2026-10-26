import { useEffect, useState } from 'react'

const KEY = 'game-mode'

function initial() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'on' || v === 'off') return v === 'on'
  } catch {
    /* storage unavailable */
  }
  // Off by default for people who've asked their OS for less motion.
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useGameMode() {
  const [on, setOn] = useState(initial)

  useEffect(() => {
    document.documentElement.dataset.game = on ? 'on' : 'off'
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off')
    } catch {
      /* storage unavailable: setting just won't persist */
    }
  }, [on])

  return [on, setOn]
}
