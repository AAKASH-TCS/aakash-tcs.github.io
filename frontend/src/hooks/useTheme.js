import { useEffect, useState } from 'react'

const KEY = 'theme'

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function initTheme() {
  document.documentElement.dataset.theme = readStored() ?? 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#05060f' : '#eef1fb')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* storage unavailable: theme just won't persist */
    }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
