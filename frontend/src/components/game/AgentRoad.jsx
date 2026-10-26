import { useEffect, useRef, useState } from 'react'
import { LEVELS } from '../../lib/game'

const CONTENT_WIDTH = 1180
const TOKEN_GAP = 230 // px of road between collectible tokens
const SAMPLE_STEP = 6 // px between road samples
const CORNER = 46

// Orthogonal waypoints → path with rounded corners.
function roundedPath(points) {
  let d = `M${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const [a, p, b] = [points[i - 1], points[i], points[i + 1]]
    const inLen = Math.hypot(p.x - a.x, p.y - a.y)
    const outLen = Math.hypot(b.x - p.x, b.y - p.y)
    const r = Math.min(CORNER, inLen / 2, outLen / 2)
    if (r < 1) {
      d += ` L${p.x} ${p.y}`
      continue
    }
    const s = { x: p.x - ((p.x - a.x) / inLen) * r, y: p.y - ((p.y - a.y) / inLen) * r }
    const e = { x: p.x + ((b.x - p.x) / outLen) * r, y: p.y + ((b.y - p.y) / outLen) * r }
    d += ` L${s.x} ${s.y} Q${p.x} ${p.y} ${e.x} ${e.y}`
  }
  const last = points[points.length - 1]
  return `${d} L${last.x} ${last.y}`
}

/**
 * The road runs down the page margins and crosses sides in the gap above each
 * section, so it never runs under text. Every waypoint gets a "key": the scroll
 * position (in page px) at which the agent should be there. Vertical stretches
 * follow the page 1:1; each crossing is spread over a short band of scrolling.
 */
function planRoute(main) {
  const width = main.clientWidth
  const inset = Math.max(20, (width - CONTENT_WIDTH) / 4)
  const centre = width / 2
  const sides = [inset, width - inset]
  const hero = document.getElementById('top')
  const startY = hero.offsetTop + hero.offsetHeight - 30

  const pts = [{ x: centre, y: startY, key: startY }]
  let x = centre
  let side = 0
  for (const level of LEVELS.slice(1)) {
    const el = document.getElementById(level.id)
    if (!el) continue
    const pad = parseFloat(getComputedStyle(el).paddingTop) || 80
    const y = el.offsetTop + pad * 0.42
    const nx = sides[side % 2]
    const band = Math.min(220, Math.abs(nx - x) * 0.22)
    pts.push({ x, y, key: y - band / 2 }, { x: nx, y, key: y + band / 2 })
    x = nx
    side++
  }
  const endY = main.scrollHeight + 56
  const band = Math.min(220, Math.abs(centre - x) * 0.22)
  pts.push({ x, y: endY, key: endY - band / 2 }, { x: centre, y: endY, key: endY + band / 2 })

  // Keys must never go backwards, or the agent would jitter.
  for (let i = 1; i < pts.length; i++) pts[i].key = Math.max(pts[i].key, pts[i - 1].key + 1)
  return { pts, d: roundedPath(pts), width, height: endY + 40 }
}

// Sample the rendered path once; scrolling then only needs a binary search.
function sampleRoute(path, pts) {
  const total = path.getTotalLength()
  const n = Math.floor(total / SAMPLE_STEP) + 1
  const lens = new Float32Array(n)
  const xs = new Float32Array(n)
  const ys = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const l = Math.min(i * SAMPLE_STEP, total)
    const p = path.getPointAtLength(l)
    lens[i] = l
    xs[i] = p.x
    ys[i] = p.y
  }

  // Path length at each waypoint (nearest sample, searching forwards).
  const vLen = []
  let from = 0
  for (const v of pts) {
    let best = from
    let bestD = Infinity
    for (let i = from; i < n; i++) {
      const dd = (xs[i] - v.x) ** 2 + (ys[i] - v.y) ** 2
      if (dd < bestD) {
        bestD = dd
        best = i
      }
    }
    vLen.push(best)
    from = best
  }

  const keys = new Float32Array(n)
  for (let v = 0; v < pts.length - 1; v++) {
    const [i0, i1] = [vLen[v], vLen[v + 1]]
    for (let i = i0; i <= i1; i++) {
      const t = i1 === i0 ? 0 : (i - i0) / (i1 - i0)
      keys[i] = pts[v].key + (pts[v + 1].key - pts[v].key) * t
    }
  }
  for (let i = vLen[pts.length - 1] + 1; i < n; i++) keys[i] = pts[pts.length - 1].key

  const tokens = []
  for (let l = 160; l < total - 120; l += TOKEN_GAP) {
    const i = Math.round(l / SAMPLE_STEP)
    tokens.push({ i, x: xs[i], y: ys[i] })
  }
  return { total, lens, xs, ys, keys, tokens }
}

function indexForKey(keys, target) {
  let lo = 0
  let hi = keys.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (keys[mid] <= target) lo = mid
    else hi = mid - 1
  }
  return lo
}

export default function AgentRoad({ onTokens }) {
  const [route, setRoute] = useState(null)
  const [samples, setSamples] = useState(null)
  const wrapRef = useRef(null)
  const pathRef = useRef(null)
  const trailRef = useRef(null)
  const agentRef = useRef(null)
  const tokensRef = useRef([])
  const maxTarget = useRef(-Infinity)
  const onTokensRef = useRef(onTokens)
  onTokensRef.current = onTokens

  // Plan the route from the real layout, and re-plan when the page resizes.
  useEffect(() => {
    const main = wrapRef.current?.parentElement
    if (!main) return
    let timer = 0
    const replan = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setRoute(planRoute(main)), 120)
    }
    replan()
    const ro = new ResizeObserver(replan)
    ro.observe(main)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  // Once the path is in the DOM, measure it (and render the tokens it implies).
  useEffect(() => {
    if (route && pathRef.current) setSamples(sampleRoute(pathRef.current, route.pts))
  }, [route])

  // Drive the agent from scroll. DOM is updated directly: no React render per frame.
  useEffect(() => {
    if (!samples) return
    const main = wrapRef.current.parentElement
    const s = samples
    let collected = 0
    let frame = 0
    tokensRef.current.forEach((el) => el?.classList.remove('is-collected'))

    trailRef.current.style.strokeDasharray = `${s.total}`
    const update = () => {
      frame = 0
      const mainTop = main.getBoundingClientRect().top + window.scrollY
      const probe = window.innerHeight * 0.55
      let target = window.scrollY + probe - mainTop
      // The finish line sits below the last section, out of the probe's reach.
      // Over the final 400px of scrolling, stretch the target so the agent arrives.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const k = Math.min(1, Math.max(0, 1 - (maxScroll - window.scrollY) / 400))
      if (k > 0) {
        const atBottom = maxScroll + probe - mainTop
        target += k * Math.max(0, s.keys[s.keys.length - 1] - atBottom)
      }
      maxTarget.current = Math.max(maxTarget.current, target)

      const i = indexForKey(s.keys, target)
      const furthest = indexForKey(s.keys, maxTarget.current)
      agentRef.current.style.transform = `translate(${s.xs[i]}px, ${s.ys[i]}px)`
      agentRef.current.dataset.moving = String(i > 0 && i < s.keys.length - 1)
      // The lit trail shows everywhere the agent has explored, not just where it is.
      trailRef.current.style.strokeDashoffset = `${s.total - s.lens[furthest]}`

      let n = 0
      while (n < s.tokens.length && s.tokens[n].i <= furthest) n++
      if (n !== collected) {
        for (let k = collected; k < n; k++) tokensRef.current[k]?.classList.add('is-collected')
        collected = n
        onTokensRef.current?.(collected, s.tokens.length)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    onTokensRef.current?.(0, s.tokens.length)
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [samples])

  return (
    <div ref={wrapRef} className="agent-road" aria-hidden="true">
      {route && (
        <svg width={route.width} height={route.height} viewBox={`0 0 ${route.width} ${route.height}`}>
          <defs>
            <linearGradient id="road-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--c1)' }} />
              <stop offset=".5" style={{ stopColor: 'var(--c2)' }} />
              <stop offset="1" style={{ stopColor: 'var(--c3)' }} />
            </linearGradient>
          </defs>
          <path ref={pathRef} d={route.d} className="road-track" />
          <path ref={trailRef} d={route.d} className="road-trail" stroke="url(#road-grad)" />
        </svg>
      )}
      {samples?.tokens.map((t, k) => (
        <span
          key={`${t.i}`}
          ref={(el) => (tokensRef.current[k] = el)}
          className="road-token"
          style={{ transform: `translate(${t.x}px, ${t.y}px)` }}
        />
      ))}
      <div ref={agentRef} className="road-agent">
        <span className="agent-ring" />
        <span className="agent-core" />
      </div>
    </div>
  )
}
