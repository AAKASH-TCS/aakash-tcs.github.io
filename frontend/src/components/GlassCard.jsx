import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const SPRING = { stiffness: 220, damping: 22 }

/**
 * Frosted-glass tile with a pointer-following spotlight and an optional 3D tilt.
 * Any framer-motion props (initial, whileInView, layout…) pass straight through.
 */
export default function GlassCard({ as = 'div', tilt = false, className = '', style, children, ...rest }) {
  const ref = useRef(null)
  const rotateX = useSpring(useMotionValue(0), SPRING)
  const rotateY = useSpring(useMotionValue(0), SPRING)
  const Comp = motion[as]

  function onPointerMove(e) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
    if (tilt && e.pointerType === 'mouse') {
      rotateY.set((x / r.width - 0.5) * 8)
      rotateX.set(-(y / r.height - 0.5) * 8)
    }
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <Comp
      ref={ref}
      className={`glass ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1000, ...style } : style}
      {...rest}
    >
      {children}
    </Comp>
  )
}
