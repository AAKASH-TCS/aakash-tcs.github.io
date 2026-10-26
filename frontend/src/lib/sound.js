/**
 * Game audio, synthesised with the Web Audio API: an original chiptune
 * adventure loop plus sound effects. No audio files, nothing to download.
 *
 * Browsers only allow audio after a click/tap/key press, so the context is
 * created lazily, and a remembered "sound on" choice resumes on the first
 * interaction of a new visit.
 */

const STORAGE_KEY = 'game-audio'
const BPM = 132
const STEP = 60 / BPM / 4 // one 16th note, in seconds
const BAR = 16
const midi = (n) => 440 * 2 ** ((n - 69) / 12)

// ---------- The tune (8 bars, C major: C F G C | Am F G C) ----------
const CHORDS = [
  [60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67],
  [69, 72, 76], [65, 69, 72], [67, 71, 74], [60, 64, 67],
]
const ROOTS = [36, 41, 43, 36, 45, 41, 43, 36]
// [bar, step, note, length in 16ths]
const MELODY = [
  [0, 0, 76, 2], [0, 2, 79, 2], [0, 4, 84, 4], [0, 8, 83, 2], [0, 10, 81, 2], [0, 12, 79, 4],
  [1, 0, 81, 2], [1, 2, 84, 2], [1, 4, 81, 2], [1, 6, 77, 2], [1, 8, 79, 2], [1, 10, 81, 2], [1, 12, 77, 4],
  [2, 0, 74, 2], [2, 2, 79, 2], [2, 4, 83, 4], [2, 8, 81, 2], [2, 10, 79, 2], [2, 12, 77, 2], [2, 14, 74, 2],
  [3, 0, 76, 4], [3, 4, 72, 4], [3, 8, 79, 2], [3, 10, 76, 2], [3, 12, 72, 4],
  [4, 0, 84, 2], [4, 2, 83, 2], [4, 4, 81, 4], [4, 8, 76, 2], [4, 10, 81, 2], [4, 12, 84, 4],
  [5, 0, 86, 2], [5, 2, 84, 2], [5, 4, 81, 4], [5, 8, 77, 2], [5, 10, 81, 2], [5, 12, 84, 4],
  [6, 0, 83, 2], [6, 2, 86, 2], [6, 4, 79, 4], [6, 8, 81, 2], [6, 10, 83, 2], [6, 12, 86, 2], [6, 14, 83, 2],
  [7, 0, 84, 6], [7, 8, 79, 2], [7, 10, 76, 2], [7, 12, 72, 2],
]
const MELODY_AT = new Map(MELODY.map(([b, s, n, l]) => [b * BAR + s, [n, l]]))
const LOOP = CHORDS.length * BAR

// ---------- State ----------
let ctx = null
let master, musicBus, sfxBus, noiseBuf
let prefs = loadPrefs()
let active = true // false while game mode is off or the tab is hidden
let timer = 0
let nextTime = 0
let step = 0
let lastToken = 0
const listeners = new Set()

function loadPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (v && typeof v === 'object') return { music: !!v.music, sfx: !!v.sfx, touched: true }
  } catch {
    /* storage unavailable */
  }
  return { music: false, sfx: false, touched: false }
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ music: prefs.music, sfx: prefs.sfx }))
  } catch {
    /* storage unavailable */
  }
}

function notify() {
  listeners.forEach((fn) => fn({ ...prefs }))
}

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(comp).connect(ctx.destination)

  // A gentle low-pass takes the edge off the square waves.
  const soften = ctx.createBiquadFilter()
  soften.type = 'lowpass'
  soften.frequency.value = 3800
  musicBus = ctx.createGain()
  musicBus.gain.value = 0.32
  musicBus.connect(soften).connect(master)

  sfxBus = ctx.createGain()
  sfxBus.gain.value = 0.55
  sfxBus.connect(master)

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  document.addEventListener('visibilitychange', syncRunning)
  return ctx
}

// ---------- Voices ----------
function tone(bus, type, freq, t, dur, gain, { slideTo, attack = 0.006 } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + dur + 0.03)
}

function noise(bus, t, dur, gain, type, freq) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(bus)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// ---------- Music scheduler (look-ahead, so timing never drifts) ----------
function scheduleStep(s, t) {
  const bar = Math.floor(s / BAR)
  const pos = s % BAR

  const m = MELODY_AT.get(s)
  if (m) tone(musicBus, 'square', midi(m[0]), t, m[1] * STEP * 0.92, 0.07)

  // Bouncy "oom-pah" bass.
  const root = ROOTS[bar]
  const bass = { 0: root, 4: root + 12, 8: root + 7, 12: root + 12 }[pos]
  if (bass) tone(musicBus, 'triangle', midi(bass), t, STEP * 3, 0.2)

  // Sparkly arpeggio an octave up, on every other 16th.
  if (pos % 2 === 0) {
    const chord = CHORDS[bar]
    tone(musicBus, 'square', midi(chord[(pos / 2) % 3] + 12), t, STEP * 0.8, 0.018)
  }

  // Drums: kick, snare, hats.
  if (pos === 0 || pos === 8 || (bar % 4 === 3 && pos === 14)) {
    tone(musicBus, 'sine', 150, t, 0.18, 0.5, { slideTo: 45, attack: 0.002 })
  }
  if (pos === 4 || pos === 12) noise(musicBus, t, 0.12, 0.22, 'bandpass', 1800)
  if (pos % 4 === 2) noise(musicBus, t, 0.04, 0.12, 'highpass', 7000)
}

function tick() {
  while (nextTime < ctx.currentTime + 0.12) {
    scheduleStep(step, nextTime)
    nextTime += STEP
    step = (step + 1) % LOOP
  }
}

function startMusic() {
  if (timer || !ctx) return
  nextTime = ctx.currentTime + 0.06
  step = 0
  timer = setInterval(tick, 25)
}

function stopMusic() {
  clearInterval(timer)
  timer = 0
}

function syncRunning() {
  if (!ctx) return
  const visible = document.visibilityState !== 'hidden'
  const wanted = active && visible && (prefs.music || prefs.sfx)
  if (wanted) ctx.resume()
  if (wanted && prefs.music) startMusic()
  else stopMusic()
  if (!wanted) ctx.suspend()
}

// ---------- Sound effects ----------
const SFX = {
  token({ combo = 1 } = {}) {
    // Coin blip; climbs a semitone per combo step (capped at an octave).
    const now = ctx.currentTime
    if (now - lastToken < 0.05) return
    lastToken = now
    const up = Math.min(combo - 1, 12)
    tone(sfxBus, 'square', midi(83 + up), now, 0.06, 0.12)
    tone(sfxBus, 'square', midi(88 + up), now + 0.055, 0.14, 0.12)
  },
  level() {
    const t = ctx.currentTime
    ;[72, 76, 79, 84].forEach((n, i) => tone(sfxBus, 'square', midi(n), t + i * 0.07, 0.12, 0.14))
    ;[72, 76, 79].forEach((n) => tone(sfxBus, 'triangle', midi(n), t + 0.3, 0.45, 0.12))
  },
  achievement() {
    const t = ctx.currentTime
    duckMusic(1.1)
    ;[79, 81, 83].forEach((n, i) => tone(sfxBus, 'square', midi(n), t + i * 0.09, 0.1, 0.13))
    ;[84, 88, 91].forEach((n) => tone(sfxBus, 'triangle', midi(n), t + 0.3, 0.6, 0.13))
    tone(sfxBus, 'square', midi(96), t + 0.3, 0.5, 0.05)
  },
  fanfare() {
    const t = ctx.currentTime
    duckMusic(2)
    const run = [67, 72, 76, 79, 84, 79, 84, 88, 91]
    run.forEach((n, i) => tone(sfxBus, 'square', midi(n), t + i * 0.09, 0.14, 0.12))
    ;[72, 76, 79, 84].forEach((n) => tone(sfxBus, 'triangle', midi(n), t + 0.85, 0.9, 0.11))
    noise(sfxBus, t + 0.85, 0.5, 0.15, 'highpass', 5000)
  },
  poke() {
    const t = ctx.currentTime
    tone(sfxBus, 'sine', 300, t, 0.12, 0.3, { slideTo: 900 })
    tone(sfxBus, 'sine', 900, t + 0.12, 0.18, 0.2, { slideTo: 220 })
  },
  click() {
    tone(sfxBus, 'square', 1400, ctx.currentTime, 0.025, 0.05)
  },
  on() {
    const t = ctx.currentTime
    tone(sfxBus, 'square', midi(76), t, 0.08, 0.1)
    tone(sfxBus, 'square', midi(84), t + 0.08, 0.16, 0.1)
  },
}

function duckMusic(seconds) {
  if (!timer) return
  const t = ctx.currentTime
  musicBus.gain.cancelScheduledValues(t)
  musicBus.gain.setTargetAtTime(0.12, t, 0.05)
  musicBus.gain.setTargetAtTime(0.32, t + seconds, 0.3)
}

// ---------- Public API ----------
export const audio = {
  get prefs() {
    return { ...prefs }
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  /** Call from a click/tap/key handler. */
  setMusic(on) {
    if (!ensureContext()) return
    prefs = { ...prefs, music: on, sfx: on ? true : prefs.sfx, touched: true }
    savePrefs()
    syncRunning()
    if (on) SFX.on()
    notify()
  },
  /** Call from a click/tap/key handler. */
  setSfx(on) {
    if (!ensureContext()) return
    prefs = { ...prefs, sfx: on, music: on ? prefs.music : false, touched: true }
    savePrefs()
    syncRunning()
    if (on) SFX.on()
    notify()
  },
  /** Pause everything while game mode is off. */
  setActive(on) {
    active = on
    syncRunning()
  },
  play(name, opts) {
    if (!ctx || !prefs.sfx || !active || ctx.state !== 'running') return
    SFX[name]?.(opts)
  },
  /** Remembered "sound on" needs one user interaction per visit to start. */
  resumeOnFirstInteraction() {
    if (!prefs.music && !prefs.sfx) return () => {}
    const events = ['pointerdown', 'keydown', 'touchend']
    const go = () => {
      events.forEach((e) => window.removeEventListener(e, go))
      if (ensureContext()) syncRunning()
    }
    events.forEach((e) => window.addEventListener(e, go, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, go))
  },
}
