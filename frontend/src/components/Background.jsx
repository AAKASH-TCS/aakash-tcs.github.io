import { useEffect } from 'react'

// Fixed aurora backdrop + a soft glow that follows the pointer.
export default function Background() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    let frame = 0
    const onMove = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const root = document.documentElement
        root.style.setProperty('--cursor-x', `${e.clientX}px`)
        root.style.setProperty('--cursor-y', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />
      <div className="bg-blob bg-blob--3" />
      <div className="bg-grid" />
      <div className="bg-noise" />
      <div className="bg-cursor" />
    </div>
  )
}
