import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export default function Typewriter({ words, speed = 65, pause = 1700 }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (reduce || !words?.length) return
    const word = words[index % words.length]
    let t
    if (!deleting && text === word) {
      t = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && text === '') {
      setDeleting(false)
      setIndex((i) => i + 1)
    } else {
      const next = deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1)
      t = setTimeout(() => setText(next), deleting ? speed / 2 : speed)
    }
    return () => clearTimeout(t)
  }, [text, deleting, index, words, speed, pause, reduce])

  if (!words?.length) return null
  return (
    <span className="typewriter">
      <span className="sr-only">{words.join(', ')}</span>
      <span aria-hidden="true">
        {reduce ? words[0] : text}
        <span className="caret" />
      </span>
    </span>
  )
}
